import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'
import { DRAG_HOLD_MS } from '../../hooks/plot/useHoldToDrag'
import {
  MOVIE_HIT_RADIUS_PX,
  pointerHitsVisibleMovieLabel,
} from '../../lib/closestMoviePoint'
import { scoringRegionScreenRect } from '../../lib/gridCanvas'
import {
  GRID_DETAIL_SCALE,
  INITIAL_SCALE,
  MAX_SCALE,
  PINCH_SETTLE_PAN_EPSILON_PX,
  PINCH_SETTLE_SCALE_EPSILON,
  canPan,
  centeredTransform,
  clampToSlot,
  doubleTapTransform,
  ghostLabelsVisibleScale,
  isNearFit,
  labelsVisibleScale,
  pinchTransform,
  pointerDistance,
  pointerMidpoint,
  zoomTowardPoint,
  type ZoomState,
} from '../../lib/plotZoom'

type PanStart = {
  pointerId: number
  x: number
  y: number
  tx: number
  ty: number
}

type PinchStart = {
  origin: ZoomState
  originMidpoint: { x: number; y: number }
  originDistance: number
}

type PointerPos = { x: number; y: number }

type GestureStart = PointerPos & { t: number }

/** WebKit-only. Safari fires these for trackpad pinch; they are not in lib.dom. */
type WebKitGestureEvent = Event & {
  scale: number
  clientX: number
  clientY: number
}

const PAN_SLOP_PX = 8
const DOUBLE_TAP_MS = 350
const DOUBLE_TAP_PX = 28
const COARSE_POINTER_QUERY = '(pointer: coarse)'
/** Trailing Safari pinch ctrl+wheel ticks can arrive after gestureend. */
const WEBKIT_GESTURE_SHADOW_MS = 120
/** Ignore a pan sample across a skipped frame so a pause does not fling. */
const INERTIA_SAMPLE_MAX_DT_MS = 64
/** Stop coasting below ~3px/frame. */
const INERTIA_MIN_VELOCITY = 0.05
/** Exponential friction time constant; ~260ms feels like Maps, not ice. */
const INERTIA_FRICTION_MS = 260
/**
 * Faster decay once a flicked pan is past the covering edge, so the
 * rubber-band overshoot stays small before the ease-back.
 */
const INERTIA_OVERSHOOT_FRICTION_MS = 90
/** Ease-out duration for one-handed double-tap zoom in/out. */
const DOUBLE_TAP_ANIM_MS = 280

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function isCoarsePointer() {
  return window.matchMedia(COARSE_POINTER_QUERY).matches
}

function wheelZoomFactor(event: WheelEvent) {
  const delta =
    event.deltaMode === 1
      ? event.deltaY * 30
      : event.deltaMode === 2
        ? event.deltaY * 300
        : event.deltaY
  return Math.exp(-delta / 800)
}

/**
 * Safari Mac trackpad pinch fires GestureEvents and a synthetic ctrl+wheel
 * for the same gesture. Applying both double-scales. Chrome/Firefox have no
 * GestureEvents; their trackpad pinch is ctrl+wheel only, so those still
 * zoom from wheel immediately.
 *
 * These ticks can arrive before gesturestart or after gestureend, so a
 * "gesture is active" skip is not enough. They are deferred one frame and
 * dropped if a GestureEvent claimed the pinch; otherwise they still zoom
 * (real Ctrl+scroll, or a pinch whose GestureEvents were missed).
 * iPhone pinch is Touch Events; coarse pointers ignore wheel entirely.
 */
function isWebKitGestureShadowWheel(event: WheelEvent) {
  return (
    event.ctrlKey &&
    'ongesturestart' in window &&
    !isCoarsePointer()
  )
}

type Props = {
  children: React.ReactNode
  /** Fires after a confirmed empty-grid tap, not on the first finger of pinch/pan/double-tap. */
  onEmptyTap?: () => void
}

export const PlotGridZoom = forwardRef<HTMLDivElement, Props>(
  function PlotGridZoom({ children, onEmptyTap }, forwardedRef) {
    const slotRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLDivElement | null>(null)
    const overlayRef = useRef<HTMLDivElement | null>(null)
    const gridRef = useRef<HTMLDivElement | null>(null)
    const stateRef = useRef<ZoomState>({ scale: INITIAL_SCALE, tx: 0, ty: 0 })
    const userTransformedRef = useRef(false)
    const pointersRef = useRef<Map<number, PointerPos>>(new Map())
    const panRef = useRef<PanStart | null>(null)
    const pinchRef = useRef<PinchStart | null>(null)
    // Last unconstrained pinch or pan translation, before covering/
    // keep-visible rubber-band. 2→1 pan and 1→2 pinch must resume from
    // this, not the compressed stateRef, or a leftover finger past the
    // edge double-compresses like inertia did.
    const pinchUnconstrainedRef = useRef<ZoomState | null>(null)
    const gestureStartRef = useRef<GestureStart | null>(null)
    const gestureMovedRef = useRef(false)
    const pinchOccurredRef = useRef(false)
    const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null)
    const emptyTapTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(
      null,
    )
    const onEmptyTapRef = useRef(onEmptyTap)
    const webkitGestureOriginRef = useRef<{
      origin: ZoomState
      originPoint: PointerPos
    } | null>(null)
    const webkitGestureActiveRef = useRef(false)
    const lastWebkitGestureAtRef = useRef(0)
    const pendingShadowWheelRef = useRef<{
      clientX: number
      clientY: number
      factor: number
    } | null>(null)
    const shadowWheelRafRef = useRef<number | null>(null)
    const lastPanSampleRef = useRef<{ x: number; y: number; t: number } | null>(
      null,
    )
    const panVelocityRef = useRef({ vx: 0, vy: 0 })
    const inertiaRafRef = useRef<number | null>(null)
    const zoomAnimRafRef = useRef<number | null>(null)
    // A tap that stops inertia or a zoom ease should not deselect.
    const caughtMotionRef = useRef(false)

    useImperativeHandle(forwardedRef, () => gridRef.current as HTMLDivElement)

    useEffect(() => {
      onEmptyTapRef.current = onEmptyTap
    }, [onEmptyTap])

    function applyTransform(opts?: { skipClamp?: boolean; rubberBand?: boolean }) {
      const canvas = canvasRef.current
      const slot = slotRef.current
      if (!canvas) return
      if (slot && !opts?.skipClamp) {
        // lockFit matches the coarse-pointer inverse-scale CSS: iPhone
        // pinch stays at or above the readable 1x grid and covering-clamps
        // axes that already filled at 1x. iPad landscape is also coarse
        // but letterboxed, so leftover axes keep-visible instead of
        // left-aligning 2x-toward-Fun=0. A mouse always keep-visible.
        // rubberBand lets a live pinch overshoot 1x / 8x and a zoomed pan
        // or flicked coast pull past the covering or keep-visible edge;
        // clamp must not re-floor scale or pin pan or the overshoot never paints.
        stateRef.current = clampToSlot(
          stateRef.current,
          { width: slot.offsetWidth, height: slot.offsetHeight },
          { width: canvas.offsetWidth, height: canvas.offsetHeight },
          isCoarsePointer(),
          opts?.rubberBand,
        )
      }
      const { scale, tx, ty } = stateRef.current
      canvas.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
      canvas.style.setProperty('--plot-scale', String(scale))
      const canvasWidth = canvas.offsetWidth
      slot?.classList.toggle(
        'grid-zoom-slot--zoomed',
        scale >= GRID_DETAIL_SCALE,
      )
      slot?.classList.toggle(
        'grid-zoom-slot--labels',
        scale >= labelsVisibleScale(canvasWidth),
      )
      slot?.classList.toggle(
        'grid-zoom-slot--ghost-labels',
        scale >= ghostLabelsVisibleScale(canvasWidth),
      )
      // Coarse pointers paint unit lines on this unscaled overlay so 1px
      // strokes stay 1px while pinch scales the canvas. A mouse hides the
      // overlay and paints the same lines on .grid::before so wheel-zoom
      // enlarges them with titles and ticks, including in a narrow window.
      // Inverse-scaling a 1px background on .grid::before rounded away on
      // WebKit once zoom passed ~1.4x.
      const overlay = overlayRef.current
      if (overlay && canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
        const region = scoringRegionScreenRect(
          scale,
          tx,
          ty,
          canvas.offsetWidth,
          canvas.offsetHeight,
        )
        overlay.style.transform = `translate3d(${region.left}px, ${region.top}px, 0)`
        overlay.style.width = `${region.width}px`
        overlay.style.height = `${region.height}px`
      }
    }

    function cancelPendingShadowWheel() {
      pendingShadowWheelRef.current = null
      if (shadowWheelRafRef.current != null) {
        cancelAnimationFrame(shadowWheelRafRef.current)
        shadowWheelRafRef.current = null
      }
    }

    function stopInertia() {
      if (inertiaRafRef.current != null) {
        cancelAnimationFrame(inertiaRafRef.current)
        inertiaRafRef.current = null
      }
    }

    function stopZoomAnimation() {
      if (zoomAnimRafRef.current != null) {
        cancelAnimationFrame(zoomAnimRafRef.current)
        zoomAnimRafRef.current = null
      }
    }

    function centerIfPristine() {
      const slot = slotRef.current
      const canvas = canvasRef.current
      if (!slot || !canvas) return
      if (userTransformedRef.current) return
      stateRef.current = centeredTransform(
        { width: slot.offsetWidth, height: slot.offsetHeight },
        { width: canvas.offsetWidth, height: canvas.offsetHeight },
        stateRef.current.scale,
      )
    }

    useLayoutEffect(() => {
      centerIfPristine()
      applyTransform()
    }, [])

    // Re-center only while the user has not pinched or panned. iOS Safari
    // resizes the visual viewport when the URL bar shows or hides, and
    // recentering on those events would fight a pinch-zoom in progress.
    useEffect(() => {
      const slot = slotRef.current
      const canvas = canvasRef.current
      if (!slot || !canvas) return
      const ro = new ResizeObserver(() => {
        centerIfPristine()
        applyTransform()
      })
      ro.observe(slot)
      ro.observe(canvas)
      return () => ro.disconnect()
    }, [])

    // Wheel / trackpad pinch → zoom toward cursor. Listen on the plot card,
    // not just the inner slot: Fun/Good axis labels live outside the slot,
    // and Chrome/Firefox trackpad pinch is wheel-only. Slot-only listening
    // left those labels as a zoom dead zone (Safari GestureEvents listen on
    // window; iPhone Touch Events use the wrapper). Cursor math stays in
    // slot space so a point on the Fun axis (negative x) still zooms toward
    // the origin.
    useEffect(() => {
      const slot = slotRef.current
      if (!slot) return
      const capturedSlot = slot
      const wrapper = capturedSlot.closest('.grid-wrapper')
      const wheelRoot = wrapper instanceof HTMLElement ? wrapper : capturedSlot

      function applyWheelZoom(clientX: number, clientY: number, factor: number) {
        stopInertia()
        stopZoomAnimation()
        const rect = capturedSlot.getBoundingClientRect()
        stateRef.current = zoomTowardPoint(
          stateRef.current,
          { x: clientX - rect.left, y: clientY - rect.top },
          factor,
        )
        userTransformedRef.current = true
        applyTransform()
      }

      function flushPendingShadowWheel() {
        shadowWheelRafRef.current = null
        const pending = pendingShadowWheelRef.current
        pendingShadowWheelRef.current = null
        if (!pending) return
        if (webkitGestureActiveRef.current) return
        if (
          performance.now() - lastWebkitGestureAtRef.current <
          WEBKIT_GESTURE_SHADOW_MS
        ) {
          return
        }
        applyWheelZoom(pending.clientX, pending.clientY, pending.factor)
      }

      function onWheel(e: WheelEvent) {
        // Always consume wheel on the plot card so the page cannot scroll
        // or pinch-zoom underneath.
        // - Chrome/Firefox trackpad pinch is ctrl+wheel and zooms immediately
        // - Safari Mac trackpad pinch is GestureEvents; its ctrl+wheel is a
        //   shadow and is deferred so real Ctrl+scroll still zooms
        // - Cmd+scroll (metaKey) and plain two-finger scroll still zoom
        //   so the grid behaves like a Figma canvas: scroll = zoom, drag = pan
        // - iPhone/iPad pinch and pan are Touch Events. A synthesized wheel
        //   during that gesture would stack on pinchTransform.
        e.preventDefault()
        e.stopPropagation()
        if (isCoarsePointer()) return
        if (webkitGestureActiveRef.current) return
        if (
          performance.now() - lastWebkitGestureAtRef.current <
          WEBKIT_GESTURE_SHADOW_MS
        ) {
          return
        }

        const factor = wheelZoomFactor(e)
        if (isWebKitGestureShadowWheel(e)) {
          // Ticks can land before gesturestart. Queue until the next frame:
          // a GestureEvent will cancel this, otherwise Ctrl+scroll (or a
          // pinch whose GestureEvents were missed) still zooms the grid.
          const pending = pendingShadowWheelRef.current
          pendingShadowWheelRef.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            factor: pending ? pending.factor * factor : factor,
          }
          if (shadowWheelRafRef.current == null) {
            shadowWheelRafRef.current = requestAnimationFrame(
              flushPendingShadowWheel,
            )
          }
          return
        }

        applyWheelZoom(e.clientX, e.clientY, factor)
      }

      // { passive: false } is required so we can call preventDefault() and
      // suppress both native page-scroll and OS-level pinch-zoom.
      wheelRoot.addEventListener('wheel', onWheel, { passive: false })
      return () => {
        cancelPendingShadowWheel()
        stopInertia()
        stopZoomAnimation()
        wheelRoot.removeEventListener('wheel', onWheel)
      }
    }, [])

    // One-finger pan; two-finger pinch-zoom on touch devices. Double-tap on
    // empty grid toggles fit vs a detail zoom toward the tap (one-handed
    // iPhone zoom, and a way back after pinch). Taps on movies select.
    // Mouse/pen use Pointer Events. A mousedown on a .movie-point defers
    // pan so hold-to-drag can still start; if the pointer moves before
    // that hold, pan wins so Figma-scaled titles (and grown markers)
    // are not dead zones after wheel-zoom into a cluster. The 44px iPhone
    // hit ring is not a mouse pan hole: desktop markers are 7px.
    // Touch uses Touch Events because iOS Safari does not deliver
    // pointerdown for a second finger, so pointer-only pinch never starts
    // on iPhone. Skipping pointer capture for touch also keeps the first
    // finger from eating the rest of the gesture. Touch pan is allowed to
    // start on a movie: moving points is mouse-only, and the ~44px hit
    // areas would otherwise eat most of a zoomed one-finger pan. A flicked
    // one-finger pan coasts with friction after lift so the zoomed grid
    // does not stop dead; that coast rubber-bands past the covering edge
    // (and leftover keep-visible gutters) and eases back, matching a
    // finger-down pull. A 2→1 pinch handoff pans from the unconstrained
    // pinch translation, and a 1→2 pan handoff pinches from the
    // unconstrained pan translation, so a leftover finger past that
    // edge does not stick from double-compressing the painted rubber-band.
    // Fit zoom never pans, so the default 0-10 square stays locked. Double-tap
    // eases to 2.2x or back to fit instead of jumping, matching that
    // coast. Pinch-out past 1x and zoomed pan past a covering or
    // keep-visible edge rubber-band, then ease back on lift, so getting
    // home or hitting an edge is not a wall. Catching a flicked coast
    // resumes from that unconstrained translation and does not count as
    // an empty-grid tap, so a finger-down to stop the grid is not sticky
    // and does not hide the selected title.
    // Mouse pan, like wheel and Touch Events, sits on the
    // plot card so a drag that starts on a Fun/Good axis still pans the
    // zoomed grid. Safari GestureEvents listen on window capture because
    // WebKit often targets document. Undo/Redo overlay clicks must not
    // capture, or the button press never fires.
    useEffect(() => {
      const slot = slotRef.current
      if (!slot) return
      const capturedSlot = slot
      const wrapper = capturedSlot.closest('.grid-wrapper')
      const gestureRoot = wrapper instanceof HTMLElement ? wrapper : capturedSlot

      function slotPoint(clientX: number, clientY: number): PointerPos {
        const rect = capturedSlot.getBoundingClientRect()
        return { x: clientX - rect.left, y: clientY - rect.top }
      }

      function stopTransientMotion() {
        stopInertia()
        stopZoomAnimation()
      }

      function animateTo(next: ZoomState, onDone?: () => void) {
        stopTransientMotion()
        const from = { ...stateRef.current }
        if (
          Math.abs(from.scale - next.scale) < 0.01 &&
          Math.abs(from.tx - next.tx) < 0.5 &&
          Math.abs(from.ty - next.ty) < 0.5
        ) {
          stateRef.current = next
          applyTransform()
          onDone?.()
          return
        }
        const startedAt = performance.now()
        const tick = (now: number) => {
          zoomAnimRafRef.current = null
          const t = Math.min(1, (now - startedAt) / DOUBLE_TAP_ANIM_MS)
          const e = easeOutCubic(t)
          stateRef.current = {
            scale: lerp(from.scale, next.scale, e),
            tx: lerp(from.tx, next.tx, e),
            ty: lerp(from.ty, next.ty, e),
          }
          // Skip clamp while interpolating so lockFit recenter cannot snap
          // the last frames of zoom-out to center before the ease finishes.
          applyTransform({ skipClamp: t < 1 })
          if (t < 1) {
            zoomAnimRafRef.current = requestAnimationFrame(tick)
            return
          }
          stateRef.current = next
          applyTransform()
          onDone?.()
        }
        zoomAnimRafRef.current = requestAnimationFrame(tick)
      }

      function resetPanVelocity() {
        lastPanSampleRef.current = null
        panVelocityRef.current = { vx: 0, vy: 0 }
      }

      function samplePanVelocity(clientX: number, clientY: number) {
        const now = performance.now()
        const last = lastPanSampleRef.current
        if (last) {
          const dt = now - last.t
          if (dt > 0 && dt < INERTIA_SAMPLE_MAX_DT_MS) {
            panVelocityRef.current = {
              vx: (clientX - last.x) / dt,
              vy: (clientY - last.y) / dt,
            }
          } else {
            panVelocityRef.current = { vx: 0, vy: 0 }
          }
        }
        lastPanSampleRef.current = { x: clientX, y: clientY, t: now }
      }

      function rememberUnconstrained(tx: number, ty: number) {
        pinchUnconstrainedRef.current = {
          scale: stateRef.current.scale,
          tx,
          ty,
        }
      }

      function startInertia() {
        const speed = Math.hypot(
          panVelocityRef.current.vx,
          panVelocityRef.current.vy,
        )
        if (speed < INERTIA_MIN_VELOCITY) {
          resetPanVelocity()
          return
        }
        stopInertia()
        const coarse = isCoarsePointer()
        // Live pan recomputes unconstrained offset from panRef origin each
        // move. Inertia has no finger, so keep unconstrained tx/ty here:
        // applyTransform(rubberBand) writes the compressed overshoot back
        // into stateRef, and adding velocity onto that would shrink the
        // overshoot every frame. Remember that origin so a catch finger
        // (1→pan or 1→2 pinch) does not resume from the compressed paint.
        let ux = stateRef.current.tx
        let uy = stateRef.current.ty
        rememberUnconstrained(ux, uy)
        let last = performance.now()
        const tick = (now: number) => {
          inertiaRafRef.current = null
          const dt = Math.min(32, now - last)
          last = now
          const v = panVelocityRef.current
          let frictionMs = INERTIA_FRICTION_MS
          if (coarse) {
            const sizes = viewSizes()
            if (sizes) {
              const clamped = clampToSlot(
                { ...stateRef.current, tx: ux, ty: uy },
                sizes.slot,
                sizes.canvas,
                true,
              )
              if (
                Math.abs(clamped.tx - ux) >= 0.5 ||
                Math.abs(clamped.ty - uy) >= 0.5
              ) {
                frictionMs = INERTIA_OVERSHOOT_FRICTION_MS
              }
            }
          }
          const friction = Math.exp(-dt / frictionMs)
          v.vx *= friction
          v.vy *= friction
          if (Math.hypot(v.vx, v.vy) < INERTIA_MIN_VELOCITY) {
            resetPanVelocity()
            // Coast may have ended in a rubber-band overshoot; ease back
            // onto the filled square instead of leaving the grid hanging.
            settlePanIfNeeded()
            return
          }
          const prevTx = stateRef.current.tx
          const prevTy = stateRef.current.ty
          ux += v.vx * dt
          uy += v.vy * dt
          rememberUnconstrained(ux, uy)
          stateRef.current.tx = ux
          stateRef.current.ty = uy
          userTransformedRef.current = true
          applyTransform({ rubberBand: coarse })
          // Covering and keep-visible rubber-band still paint a small
          // move. A maxed-out overshoot freezes the visual; stop and
          // ease back rather than buzzing or accumulating unconstrained pan.
          if (
            Math.abs(stateRef.current.tx - prevTx) < 0.1 &&
            Math.abs(stateRef.current.ty - prevTy) < 0.1
          ) {
            resetPanVelocity()
            settlePanIfNeeded()
            return
          }
          inertiaRafRef.current = requestAnimationFrame(tick)
        }
        inertiaRafRef.current = requestAnimationFrame(tick)
      }

      function cancelEmptyTap() {
        if (emptyTapTimerRef.current != null) {
          window.clearTimeout(emptyTapTimerRef.current)
          emptyTapTimerRef.current = null
        }
      }

      function scheduleEmptyTap(startedAt: number) {
        cancelEmptyTap()
        emptyTapTimerRef.current = window.setTimeout(() => {
          emptyTapTimerRef.current = null
          const last = lastTapRef.current
          if (!last || last.t !== startedAt) return
          lastTapRef.current = null
          onEmptyTapRef.current?.()
        }, DOUBLE_TAP_MS)
      }

      // iPhone tap-to-select uses a 44px ring around the 11px marker
      // (::before does not expand getBoundingClientRect). Double-tap zoom
      // must treat those taps as select/cycle, not zoom-in.
      function isNearMoviePoint(clientX: number, clientY: number) {
        for (const pt of capturedSlot.querySelectorAll(
          '.movie-point:not(.ghost-point)',
        )) {
          const r = pt.getBoundingClientRect()
          const dx = clientX - (r.left + r.width / 2)
          const dy = clientY - (r.top + r.height / 2)
          if (
            dx * dx + dy * dy <
            MOVIE_HIT_RADIUS_PX * MOVIE_HIT_RADIUS_PX
          ) {
            return true
          }
        }
        return false
      }

      function activePair() {
        const pts = [...pointersRef.current.values()]
        if (pts.length < 2) return null
        return [pts[0], pts[1]] as const
      }

      function capturePointer(pointerId: number) {
        try {
          gestureRoot.setPointerCapture(pointerId)
        } catch {
          // Pointer may already have been released.
        }
      }

      function setPanCursor(on: boolean) {
        const cursor = on ? 'grabbing' : ''
        gestureRoot.style.cursor = cursor
        capturedSlot.style.cursor = cursor
      }

      function beginPinchFromPoints(a: PointerPos, b: PointerPos) {
        stopTransientMotion()
        resetPanVelocity()
        panRef.current = null
        setPanCursor(false)
        pinchOccurredRef.current = true
        gestureMovedRef.current = true
        cancelEmptyTap()
        lastTapRef.current = null
        pinchRef.current = {
          // 3→2 and 1→2 restart from the last unconstrained pinch or pan,
          // not the compressed paint, so a pair that was already past the
          // edge does not stick the way 2→1 pan used to.
          origin: { ...(pinchUnconstrainedRef.current ?? stateRef.current) },
          originMidpoint: pointerMidpoint(a, b),
          originDistance: pointerDistance(a, b),
        }
      }

      function beginPinchFromPointers() {
        const pair = activePair()
        if (!pair) return
        beginPinchFromPoints(pair[0], pair[1])
      }

      function applyPinch(currentA: PointerPos, currentB: PointerPos) {
        const pinch = pinchRef.current
        if (!pinch) return
        const coarse = isCoarsePointer()
        const unconstrained = pinchTransform(
          pinch.origin,
          pinch.originMidpoint,
          pinch.originDistance,
          pointerMidpoint(currentA, currentB),
          pointerDistance(currentA, currentB),
          coarse
            ? {
                minScale: INITIAL_SCALE,
                maxScale: MAX_SCALE,
                rubberBand: true,
              }
            : undefined,
        )
        pinchUnconstrainedRef.current = unconstrained
        stateRef.current = unconstrained
        userTransformedRef.current = true
        applyTransform({ rubberBand: coarse })
      }

      function viewSizes() {
        const canvas = canvasRef.current
        if (!canvas) return null
        return {
          slot: {
            width: capturedSlot.offsetWidth,
            height: capturedSlot.offsetHeight,
          },
          canvas: { width: canvas.offsetWidth, height: canvas.offsetHeight },
        }
      }

      function beginPan(id: number, clientX: number, clientY: number) {
        const panOrigin = pinchUnconstrainedRef.current
        const sizes = viewSizes()
        if (
          !sizes ||
          !canPan(stateRef.current, sizes.slot, sizes.canvas, isCoarsePointer())
        ) {
          return
        }
        stopTransientMotion()
        resetPanVelocity()
        const tx = panOrigin?.tx ?? stateRef.current.tx
        const ty = panOrigin?.ty ?? stateRef.current.ty
        panRef.current = {
          pointerId: id,
          x: clientX,
          y: clientY,
          tx,
          ty,
        }
        // Keep unconstrained pan for a 1→2 pinch or a catch of inertia.
        // Clearing it here made the next pinch origin the compressed
        // paint, the same sticky handoff 2→1 had before this ref existed.
        rememberUnconstrained(tx, ty)
        setPanCursor(true)
      }

      function noteGestureStart(clientX: number, clientY: number) {
        gestureStartRef.current = {
          x: clientX,
          y: clientY,
          t: performance.now(),
        }
        gestureMovedRef.current = false
      }

      // Hold-to-drag owns a still-then-move on a marker or title. Early
      // movement on that same pointer is a pan, so wheel-zoomed labels
      // (and canvas-scaled markers) do not become dead zones.
      function maybeBeginDeferredPan(
        id: number,
        clientX: number,
        clientY: number,
      ) {
        if (panRef.current) return
        const start = gestureStartRef.current
        if (!start) return
        if (performance.now() - start.t >= DRAG_HOLD_MS) return
        if (Math.hypot(clientX - start.x, clientY - start.y) < PAN_SLOP_PX) {
          return
        }
        capturePointer(id)
        beginPan(id, clientX, clientY)
      }

      function noteGestureMove(clientX: number, clientY: number) {
        const start = gestureStartRef.current
        if (!start || gestureMovedRef.current) return
        if (Math.hypot(clientX - start.x, clientY - start.y) >= PAN_SLOP_PX) {
          gestureMovedRef.current = true
          cancelEmptyTap()
          lastTapRef.current = null
        }
      }

      function movePan(id: number, clientX: number, clientY: number) {
        if (!panRef.current || panRef.current.pointerId !== id) return
        noteGestureMove(clientX, clientY)
        if (!gestureMovedRef.current) return
        samplePanVelocity(clientX, clientY)
        const tx = panRef.current.tx + (clientX - panRef.current.x)
        const ty = panRef.current.ty + (clientY - panRef.current.y)
        rememberUnconstrained(tx, ty)
        stateRef.current.tx = tx
        stateRef.current.ty = ty
        userTransformedRef.current = true
        applyTransform({ rubberBand: isCoarsePointer() })
      }

      function fitTransform(): ZoomState | null {
        const slot = slotRef.current
        const canvas = canvasRef.current
        if (!slot || !canvas) return null
        return centeredTransform(
          { width: slot.offsetWidth, height: slot.offsetHeight },
          { width: canvas.offsetWidth, height: canvas.offsetHeight },
          INITIAL_SCALE,
        )
      }

      function applyDoubleTap(point: PointerPos) {
        const fit = fitTransform()
        const canvas = canvasRef.current
        if (!fit || !canvas) return
        // Zoom far enough that 3.75rem pills fit one cell on this square.
        // A 370px portrait plot stays at 2.2x; a ~280px landscape plot
        // needs closer to 2.9x or titles overlap 1-unit neighbors.
        const next = doubleTapTransform(
          stateRef.current,
          point,
          fit,
          labelsVisibleScale(canvas.offsetWidth),
        )
        // Keep userTransformed true during the ease so a URL-bar resize
        // cannot recenter a zoom-out mid-flight. Restore fit's pristine
        // flag only after the animation lands on the readable square.
        userTransformedRef.current = true
        animateTo(next, () => {
          userTransformedRef.current = !isNearFit(next, fit)
        })
      }

      // Pinch-out past 1x rubber-bands during the gesture; on lift, ease
      // back to the locked 0-10 square. A 1.1x leftover is also settled
      // so pan does not unlock for a few pixels of overflow.
      function settlePinchIfNeeded() {
        if (!isCoarsePointer()) return false
        const fit = fitTransform()
        const slot = slotRef.current
        const canvas = canvasRef.current
        if (!fit || !slot || !canvas) return false
        const current = stateRef.current
        const overshotMin = current.scale < INITIAL_SCALE
        const overshotMax = current.scale > MAX_SCALE
        const nearFit = isNearFit(
          current,
          fit,
          PINCH_SETTLE_SCALE_EPSILON,
          PINCH_SETTLE_PAN_EPSILON_PX,
        )
        if (!overshotMin && !overshotMax && !nearFit) return false
        resetPanVelocity()
        pinchUnconstrainedRef.current = null
        userTransformedRef.current = true
        if (overshotMax) {
          const next = clampToSlot(
            { ...current, scale: MAX_SCALE },
            { width: slot.offsetWidth, height: slot.offsetHeight },
            { width: canvas.offsetWidth, height: canvas.offsetHeight },
            true,
          )
          animateTo(next)
          return true
        }
        animateTo(fit, () => {
          userTransformedRef.current = false
        })
        return true
      }

      // Zoomed covering (and leftover keep-visible) pan rubber-bands past
      // the edge while the finger is down or while flicked inertia is still
      // coasting; on rest, ease back onto the filled square or the 48px
      // visible slice. Skip this while a 2→1 pinch handoff
      // still has a finger down so the remaining contact can keep the
      // overshoot instead of fighting the ease.
      function settlePanIfNeeded() {
        if (!isCoarsePointer()) return false
        const sizes = viewSizes()
        if (!sizes) return false
        const current = stateRef.current
        const clamped = clampToSlot(current, sizes.slot, sizes.canvas, true)
        if (
          Math.abs(clamped.tx - current.tx) < 0.5 &&
          Math.abs(clamped.ty - current.ty) < 0.5
        ) {
          return false
        }
        resetPanVelocity()
        // Drop the overshoot origin so a catch during the ease-back
        // grabs the interpolated view instead of jumping to unconstrained.
        pinchUnconstrainedRef.current = null
        userTransformedRef.current = true
        animateTo(clamped)
        return true
      }

      function maybeDoubleTap(clientX: number, clientY: number) {
        if (gestureMovedRef.current || pinchOccurredRef.current) {
          cancelEmptyTap()
          lastTapRef.current = null
          return false
        }
        // Marker taps select (and stacked markers cycle). On a fitted
        // ~370px square many movies sit inside DOUBLE_TAP_PX of each
        // other, so tap-A-then-tap-B would jump to 2.2x instead of
        // switching the title. Empty-space double-tap still zooms.
        if (isNearMoviePoint(clientX, clientY)) {
          cancelEmptyTap()
          lastTapRef.current = null
          return false
        }
        // Painted title pills are pointer-events: none, so a tap on the
        // selected readout or a zoomed title hits the grid. Counting that
        // as double-tap would zoom while the user is trying to read it.
        if (pointerHitsVisibleMovieLabel(capturedSlot, clientX, clientY)) {
          cancelEmptyTap()
          lastTapRef.current = null
          return false
        }
        const now = performance.now()
        const last = lastTapRef.current
        if (
          last &&
          now - last.t <= DOUBLE_TAP_MS &&
          Math.hypot(clientX - last.x, clientY - last.y) <= DOUBLE_TAP_PX
        ) {
          cancelEmptyTap()
          lastTapRef.current = null
          applyDoubleTap(slotPoint(clientX, clientY))
          return true
        }
        lastTapRef.current = { t: now, x: clientX, y: clientY }
        // Wrapper pointerdown would deselect on the first finger of a
        // pinch, pan, or double-tap, hiding the only fit-zoom title.
        // Wait out the double-tap window so a confirmed empty tap is
        // the only touch path that clears the selection. A tap that
        // caught inertia or a zoom ease still records lastTap so a
        // follow-up can double-tap, but must not deselect.
        if (!caughtMotionRef.current) {
          scheduleEmptyTap(now)
        }
        return false
      }

      function onPointerDown(e: PointerEvent) {
        if (e.pointerType === 'touch') return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        stopTransientMotion()
        const target = e.target as Element | null
        // Plot-card pan would steal Undo/Redo (and any other control on the
        // wrapper). Fun/Good axis labels are not controls; they should pan.
        if (target?.closest('.grid-toolbar') || target?.closest('button')) {
          return
        }

        pointersRef.current.set(e.pointerId, slotPoint(e.clientX, e.clientY))
        noteGestureStart(e.clientX, e.clientY)

        if (pointersRef.current.size >= 2) {
          e.preventDefault()
          capturePointer(e.pointerId)
          beginPinchFromPointers()
          return
        }

        // Defer pan on the marker and its title so a click still selects
        // and a still-then-move still drags. Immediate pan would capture
        // the pointer and fight hold-to-drag; skipping pan forever made
        // Figma-scaled titles dead zones after wheel-zoom into a cluster.
        if (target?.closest('.movie-point')) return

        capturePointer(e.pointerId)
        beginPan(e.pointerId, e.clientX, e.clientY)
      }

      function onPointerMove(e: PointerEvent) {
        if (e.pointerType === 'touch') return
        if (!pointersRef.current.has(e.pointerId)) return
        pointersRef.current.set(e.pointerId, slotPoint(e.clientX, e.clientY))

        if (pinchRef.current && pointersRef.current.size >= 2) {
          e.preventDefault()
          const pair = activePair()
          if (!pair) return
          applyPinch(pair[0], pair[1])
          return
        }

        maybeBeginDeferredPan(e.pointerId, e.clientX, e.clientY)
        movePan(e.pointerId, e.clientX, e.clientY)
      }

      function onPointerUp(e: PointerEvent) {
        if (e.pointerType === 'touch') return
        if (!pointersRef.current.has(e.pointerId)) return
        pointersRef.current.delete(e.pointerId)
        if (panRef.current?.pointerId === e.pointerId) {
          panRef.current = null
          setPanCursor(false)
        }
        if (pinchRef.current) {
          if (pointersRef.current.size >= 2) {
            beginPinchFromPointers()
          } else {
            pinchRef.current = null
          }
        }
      }

      function touchPoint(touch: Touch): PointerPos {
        return slotPoint(touch.clientX, touch.clientY)
      }

      // TouchEvent.touches is every contact on the screen, including a
      // thumb on the sidebar. Pinch/pan/double-tap must only count fingers
      // that started on the plot card (slot, axes, padding). Otherwise a
      // list-scroll plus a grid tap is a two-finger pinch, and a 2→1 lift
      // while the other thumb is on the list pinches against that thumb
      // instead of handing off to pan.
      function isPlotTouch(touch: Touch) {
        const target = touch.target
        return target instanceof Node && gestureRoot.contains(target)
      }

      function plotTouches(list: TouchList) {
        const fingers: Touch[] = []
        for (let i = 0; i < list.length; i += 1) {
          const touch = list[i]
          if (isPlotTouch(touch)) fingers.push(touch)
        }
        return fingers
      }

      function beginPinchFromTouches(fingers: Touch[]) {
        if (fingers.length < 2) return
        beginPinchFromPoints(touchPoint(fingers[0]), touchPoint(fingers[1]))
      }

      function onTouchStart(e: TouchEvent) {
        const fingers = plotTouches(e.touches)
        if (fingers.length >= 2) {
          e.preventDefault()
          beginPinchFromTouches(fingers)
          return
        }

        if (fingers.length !== 1) return
        const touch = fingers[0]
        // Check before stopTransientMotion clears the rAF ids. A finger
        // that stops a flicked coast (or in-flight ease) is a catch, not
        // an empty-grid tap.
        caughtMotionRef.current =
          inertiaRafRef.current != null || zoomAnimRafRef.current != null
        stopTransientMotion()
        pinchOccurredRef.current = false
        // A follow-up finger may be the second half of a double-tap or a
        // pan. Cancel the pending empty-tap deselect without clearing
        // lastTap, or pinch/pan after a tap would hide the selected title.
        cancelEmptyTap()
        noteGestureStart(touch.clientX, touch.clientY)
        // beginPan is a no-op at fit zoom on coarse pointers; when zoomed it
        // must start even if the finger landed on a movie, or the 44px
        // targets block pan. A mouse can pan at fit, including a square plot.
        beginPan(touch.identifier, touch.clientX, touch.clientY)
      }

      function onTouchMove(e: TouchEvent) {
        const fingers = plotTouches(e.touches)
        if (pinchRef.current && fingers.length >= 2) {
          e.preventDefault()
          applyPinch(touchPoint(fingers[0]), touchPoint(fingers[1]))
          return
        }

        if (fingers.length !== 1) return
        const touch = fingers[0]
        if (panRef.current) {
          e.preventDefault()
          movePan(touch.identifier, touch.clientX, touch.clientY)
          return
        }
        // At fit zoom, pan is a no-op so panRef stays null. Track travel on
        // a movie so a sliding tap is not mistaken for a double-tap zoom.
        // Empty-space jitter at fit must not count, or zoom-in never fires.
        const target = e.target as Element | null
        if (target?.closest('.movie-point')) {
          noteGestureMove(touch.clientX, touch.clientY)
        }
      }

      function endTouchGesture() {
        pinchRef.current = null
        pinchUnconstrainedRef.current = null
        panRef.current = null
        setPanCursor(false)
      }

      function onTouchEnd(e: TouchEvent) {
        const fingers = plotTouches(e.touches)
        if (fingers.length >= 2) {
          beginPinchFromTouches(fingers)
          return
        }
        if (fingers.length === 1) {
          // 2→1 must keep the remaining plot finger as a pan from the
          // unconstrained pinch translation. Count only plot-card contacts:
          // e.touches also includes a sidebar thumb, which would restart
          // pinch against that off-grid finger or skip this handoff
          // entirely (length stays >= 2). Rubber-band or near-fit pinch-out
          // settles to 1x instead of handing off a sub-fit pan. A leftover
          // finger past a covering/keep-visible edge must not take the
          // compressed paint as pan origin, or each move double-compresses.
          const wasPinch = Boolean(pinchRef.current)
          pinchRef.current = null
          if (wasPinch && settlePinchIfNeeded()) {
            pinchUnconstrainedRef.current = null
            return
          }
          const touch = fingers[0]
          beginPan(touch.identifier, touch.clientX, touch.clientY)
          return
        }
        const ended = plotTouches(e.changedTouches)[0] ?? e.changedTouches[0]
        const doubled = ended
          ? maybeDoubleTap(ended.clientX, ended.clientY)
          : false
        caughtMotionRef.current = false
        if (!ended) {
          lastTapRef.current = null
        }
        if (doubled) {
          e.preventDefault()
          // The zoom ease is already in flight. Do not settle pan or
          // start inertia; those would cancel animateTo.
          endTouchGesture()
          resetPanVelocity()
          return
        }
        // One-finger flick: keep the zoomed grid moving after lift. Fit
        // zoom never sets panRef, so the default 0-10 square stays locked.
        // Already-overshot pan must settle first: stateRef holds the
        // compressed rubber-band, and inertia would treat that as
        // unconstrained and snap back. In-bounds coast rubber-bands when
        // it later hits the covering edge.
        const wasPinch = Boolean(pinchRef.current)
        const coast =
          Boolean(panRef.current) &&
          gestureMovedRef.current &&
          !pinchRef.current
        endTouchGesture()
        if (wasPinch && settlePinchIfNeeded()) return
        if (settlePanIfNeeded()) return
        if (coast) startInertia()
        else resetPanVelocity()
      }

      function onTouchCancel() {
        cancelEmptyTap()
        lastTapRef.current = null
        caughtMotionRef.current = false
        stopTransientMotion()
        resetPanVelocity()
        endTouchGesture()
        // Drop rubber-band overshoot immediately; a cancelled gesture
        // should not leave the square undersized until the next resize.
        applyTransform()
      }

      function webkitGesturePoint(event: WebKitGestureEvent): PointerPos {
        if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
          return slotPoint(event.clientX, event.clientY)
        }
        return {
          x: capturedSlot.offsetWidth / 2,
          y: capturedSlot.offsetHeight / 2,
        }
      }

      function clientOnPlot(clientX: number, clientY: number) {
        if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false
        const rect = gestureRoot.getBoundingClientRect()
        return (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        )
      }

      function webkitGestureOnPlot(event: Event) {
        const target = event.target
        if (target instanceof Node && gestureRoot.contains(target)) {
          return true
        }
        const gesture = event as WebKitGestureEvent
        return clientOnPlot(gesture.clientX, gesture.clientY)
      }

      // Safari page-zoom gestures fight custom pinch unless they are cancelled.
      // On iPhone, Touch Events own pinch (GestureEvents would double-zoom).
      // On Safari Mac, trackpad pinch is GestureEvents, not Touch Events, so
      // swallowing them without applying scale left Figma-style pinch dead.
      // Listen on window capture: WebKit often targets document, so a plot-card
      // listener never sees the gesture. Safari's matching ctrl+wheel is
      // deferred one frame and cancelled here so it cannot double-scale; if
      // these events never arrive, that deferred wheel is the pinch fallback.
      function onWebkitGestureStart(event: Event) {
        event.preventDefault()
        if (pinchRef.current || isCoarsePointer()) return
        if (!webkitGestureOnPlot(event)) return
        stopTransientMotion()
        const gesture = event as WebKitGestureEvent
        cancelPendingShadowWheel()
        webkitGestureActiveRef.current = true
        lastWebkitGestureAtRef.current = performance.now()
        webkitGestureOriginRef.current = {
          origin: { ...stateRef.current },
          originPoint: webkitGesturePoint(gesture),
        }
        pinchOccurredRef.current = true
        gestureMovedRef.current = true
      }

      function onWebkitGestureChange(event: Event) {
        event.preventDefault()
        const start = webkitGestureOriginRef.current
        if (pinchRef.current || !start || isCoarsePointer()) return
        const gesture = event as WebKitGestureEvent
        if (!Number.isFinite(gesture.scale) || gesture.scale <= 0) return
        // gesture.scale is relative to gesturestart (1 at rest), so treat
        // originDistance as 1 and reuse the two-finger pinch math.
        stateRef.current = pinchTransform(
          start.origin,
          start.originPoint,
          1,
          webkitGesturePoint(gesture),
          gesture.scale,
        )
        userTransformedRef.current = true
        applyTransform()
      }

      function onWebkitGestureEnd(event: Event) {
        event.preventDefault()
        webkitGestureOriginRef.current = null
        webkitGestureActiveRef.current = false
        lastWebkitGestureAtRef.current = performance.now()
        cancelPendingShadowWheel()
      }

      const touchOpts: AddEventListenerOptions = { passive: false, capture: true }
      const gestureOpts: AddEventListenerOptions = { capture: true, passive: false }

      // Capture phase so a drag on Fun/Good axis chrome still pans, matching
      // wheel and touch listeners already on the plot card.
      gestureRoot.addEventListener('pointerdown', onPointerDown, { capture: true })
      gestureRoot.addEventListener('pointermove', onPointerMove)
      gestureRoot.addEventListener('pointerup', onPointerUp)
      gestureRoot.addEventListener('pointercancel', onPointerUp)
      gestureRoot.addEventListener('touchstart', onTouchStart, touchOpts)
      gestureRoot.addEventListener('touchmove', onTouchMove, touchOpts)
      gestureRoot.addEventListener('touchend', onTouchEnd, touchOpts)
      gestureRoot.addEventListener('touchcancel', onTouchCancel, touchOpts)
      window.addEventListener('gesturestart', onWebkitGestureStart, gestureOpts)
      window.addEventListener('gesturechange', onWebkitGestureChange, gestureOpts)
      window.addEventListener('gestureend', onWebkitGestureEnd, gestureOpts)

      return () => {
        cancelEmptyTap()
        cancelPendingShadowWheel()
        stopTransientMotion()
        gestureRoot.removeEventListener('pointerdown', onPointerDown, { capture: true })
        gestureRoot.removeEventListener('pointermove', onPointerMove)
        gestureRoot.removeEventListener('pointerup', onPointerUp)
        gestureRoot.removeEventListener('pointercancel', onPointerUp)
        gestureRoot.removeEventListener('touchstart', onTouchStart, touchOpts)
        gestureRoot.removeEventListener('touchmove', onTouchMove, touchOpts)
        gestureRoot.removeEventListener('touchend', onTouchEnd, touchOpts)
        gestureRoot.removeEventListener('touchcancel', onTouchCancel, touchOpts)
        window.removeEventListener('gesturestart', onWebkitGestureStart, gestureOpts)
        window.removeEventListener('gesturechange', onWebkitGestureChange, gestureOpts)
        window.removeEventListener('gestureend', onWebkitGestureEnd, gestureOpts)
      }
    }, [])

    return (
      <div ref={slotRef} className="grid-zoom-slot">
        <div ref={overlayRef} className="grid-line-overlay" aria-hidden="true" />
        <div ref={canvasRef} className="grid-zoom-canvas">
          <div ref={gridRef} className="grid">
            {children}
          </div>
        </div>
      </div>
    )
  },
)

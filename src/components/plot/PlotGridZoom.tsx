import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'
import {
  MOVIE_HIT_RADIUS_PX,
  pointerHitsVisibleMovieLabel,
} from '../../lib/closestMoviePoint'
import { scoringRegionScreenRect } from '../../lib/gridCanvas'
import {
  GHOST_LABELS_VISIBLE_SCALE,
  GRID_DETAIL_SCALE,
  INITIAL_SCALE,
  LABELS_VISIBLE_SCALE,
  canPan,
  centeredTransform,
  clampToSlot,
  doubleTapTransform,
  isNearFit,
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

function isCoarsePointer() {
  return window.matchMedia(COARSE_POINTER_QUERY).matches
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
    const gestureStartRef = useRef<PointerPos | null>(null)
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

    useImperativeHandle(forwardedRef, () => gridRef.current as HTMLDivElement)

    useEffect(() => {
      onEmptyTapRef.current = onEmptyTap
    }, [onEmptyTap])

    function applyTransform() {
      const canvas = canvasRef.current
      const slot = slotRef.current
      if (!canvas) return
      if (slot) {
        // lockFit matches the coarse-pointer inverse-scale CSS: iPhone
        // pinch stays at or above the readable 1x grid. A mouse must not
        // use the filled-square geometry as a stand-in, or a square or
        // narrow desktop window loses Figma zoom-out and fit pan.
        stateRef.current = clampToSlot(
          stateRef.current,
          { width: slot.offsetWidth, height: slot.offsetHeight },
          { width: canvas.offsetWidth, height: canvas.offsetHeight },
          isCoarsePointer(),
        )
      }
      const { scale, tx, ty } = stateRef.current
      canvas.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
      canvas.style.setProperty('--plot-scale', String(scale))
      slot?.classList.toggle(
        'grid-zoom-slot--zoomed',
        scale >= GRID_DETAIL_SCALE,
      )
      slot?.classList.toggle(
        'grid-zoom-slot--labels',
        scale >= LABELS_VISIBLE_SCALE,
      )
      slot?.classList.toggle(
        'grid-zoom-slot--ghost-labels',
        scale >= GHOST_LABELS_VISIBLE_SCALE,
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

    // Wheel / trackpad pinch → zoom toward cursor
    useEffect(() => {
      const slot = slotRef.current
      if (!slot) return
      const capturedSlot = slot

      function onWheel(e: WheelEvent) {
        // Always zoom when the cursor is inside the slot.
        // - Trackpad pinch fires wheel with synthetic ctrlKey=true
        // - Cmd/Ctrl + scroll fires wheel with metaKey/ctrlKey=true
        // - Plain two-finger scroll (no modifier) is also captured here so that
        //   the grid behaves like a Figma canvas: scroll = zoom, drag = pan.
        e.preventDefault()
        e.stopPropagation()
        // Safari also fires GestureEvents for the same pinch. Those drive
        // zoom on fine pointers; ignoring wheel here avoids double-scale.
        if (webkitGestureActiveRef.current) return

        const rect = capturedSlot.getBoundingClientRect()
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top
        const delta =
          e.deltaMode === 1 ? e.deltaY * 30 : e.deltaMode === 2 ? e.deltaY * 300 : e.deltaY
        const factor = Math.exp(-delta / 800)

        stateRef.current = zoomTowardPoint(
          stateRef.current,
          { x: cursorX, y: cursorY },
          factor,
        )
        userTransformedRef.current = true
        applyTransform()
      }

      // { passive: false } is required so we can call preventDefault() and
      // suppress both native page-scroll and OS-level pinch-zoom.
      capturedSlot.addEventListener('wheel', onWheel, { passive: false })
      return () => capturedSlot.removeEventListener('wheel', onWheel)
    }, [])

    // One-finger pan; two-finger pinch-zoom on touch devices. Double-tap on
    // empty grid toggles fit vs a 2.2x zoom toward the tap (one-handed
    // iPhone zoom, and a way back after pinch). Taps on movies select.
    // Mouse/pen use Pointer Events and skip pan only when the cursor is on
    // a .movie-point so hold-to-drag can start. The 44px iPhone hit ring is
    // not a mouse pan hole: desktop markers are 7px, and after wheel-zoom
    // into a cluster a 22px radius around every dot would block pan.
    // Touch uses Touch Events because iOS Safari does not deliver
    // pointerdown for a second finger, so pointer-only pinch never starts
    // on iPhone. Skipping pointer capture for touch also keeps the first
    // finger from eating the rest of the gesture. Touch pan is allowed to
    // start on a movie: moving points is mouse-only, and the ~44px hit
    // areas would otherwise eat most of a zoomed one-finger pan. Touch
    // listeners sit on the plot card so a pinch that starts on a Fun/Good
    // axis still zooms the grid.
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
          capturedSlot.setPointerCapture(pointerId)
        } catch {
          // Pointer may already have been released.
        }
      }

      function beginPinchFromPoints(a: PointerPos, b: PointerPos) {
        panRef.current = null
        capturedSlot.style.cursor = ''
        pinchOccurredRef.current = true
        gestureMovedRef.current = true
        cancelEmptyTap()
        lastTapRef.current = null
        pinchRef.current = {
          origin: { ...stateRef.current },
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
        stateRef.current = pinchTransform(
          pinch.origin,
          pinch.originMidpoint,
          pinch.originDistance,
          pointerMidpoint(currentA, currentB),
          pointerDistance(currentA, currentB),
        )
        userTransformedRef.current = true
        applyTransform()
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
        const sizes = viewSizes()
        if (
          !sizes ||
          !canPan(stateRef.current, sizes.slot, sizes.canvas, isCoarsePointer())
        ) {
          return
        }
        panRef.current = {
          pointerId: id,
          x: clientX,
          y: clientY,
          tx: stateRef.current.tx,
          ty: stateRef.current.ty,
        }
        capturedSlot.style.cursor = 'grabbing'
      }

      function noteGestureStart(clientX: number, clientY: number) {
        gestureStartRef.current = { x: clientX, y: clientY }
        gestureMovedRef.current = false
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
        stateRef.current.tx = panRef.current.tx + (clientX - panRef.current.x)
        stateRef.current.ty = panRef.current.ty + (clientY - panRef.current.y)
        userTransformedRef.current = true
        applyTransform()
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
        if (!fit) return
        const next = doubleTapTransform(stateRef.current, point, fit)
        stateRef.current = next
        userTransformedRef.current = !isNearFit(next, fit)
        applyTransform()
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
        // the only touch path that clears the selection.
        scheduleEmptyTap(now)
        return false
      }

      function onPointerDown(e: PointerEvent) {
        if (e.pointerType === 'touch') return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        pointersRef.current.set(e.pointerId, slotPoint(e.clientX, e.clientY))
        capturePointer(e.pointerId)
        noteGestureStart(e.clientX, e.clientY)

        if (pointersRef.current.size >= 2) {
          e.preventDefault()
          beginPinchFromPointers()
          return
        }

        // Hold-to-drag starts from the 7px marker (and its title). Do not
        // also skip the 22px iPhone hit ring or wheel-zoom into a cluster
        // leaves pan holes around every movie.
        const target = e.target as Element | null
        if (target?.closest('.movie-point')) return

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

        movePan(e.pointerId, e.clientX, e.clientY)
      }

      function onPointerUp(e: PointerEvent) {
        if (e.pointerType === 'touch') return
        if (!pointersRef.current.has(e.pointerId)) return
        pointersRef.current.delete(e.pointerId)
        if (panRef.current?.pointerId === e.pointerId) {
          panRef.current = null
          capturedSlot.style.cursor = ''
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

      function beginPinchFromTouches(touches: TouchList) {
        if (touches.length < 2) return
        beginPinchFromPoints(touchPoint(touches[0]), touchPoint(touches[1]))
      }

      function onTouchStart(e: TouchEvent) {
        if (e.touches.length >= 2) {
          e.preventDefault()
          beginPinchFromTouches(e.touches)
          return
        }

        if (e.touches.length !== 1) return
        const touch = e.touches[0]
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
        if (pinchRef.current && e.touches.length >= 2) {
          e.preventDefault()
          applyPinch(touchPoint(e.touches[0]), touchPoint(e.touches[1]))
          return
        }

        if (e.touches.length !== 1) return
        const touch = e.touches[0]
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
        panRef.current = null
        capturedSlot.style.cursor = ''
      }

      function onTouchEnd(e: TouchEvent) {
        if (e.touches.length >= 2) {
          beginPinchFromTouches(e.touches)
          return
        }
        if (e.touches.length === 1) {
          endTouchGesture()
          return
        }
        const ended = e.changedTouches[0]
        if (ended) {
          if (maybeDoubleTap(ended.clientX, ended.clientY)) {
            e.preventDefault()
          }
        } else {
          lastTapRef.current = null
        }
        endTouchGesture()
      }

      function onTouchCancel() {
        cancelEmptyTap()
        lastTapRef.current = null
        endTouchGesture()
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

      // Safari page-zoom gestures fight custom pinch unless they are cancelled.
      // On iPhone, Touch Events own pinch (GestureEvents would double-zoom).
      // On Safari Mac, trackpad pinch is GestureEvents, not Touch Events, so
      // swallowing them without applying scale left Figma-style pinch dead.
      function onWebkitGestureStart(event: Event) {
        event.preventDefault()
        if (pinchRef.current || isCoarsePointer()) return
        const gesture = event as WebKitGestureEvent
        webkitGestureActiveRef.current = true
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
      }

      const touchOpts: AddEventListenerOptions = { passive: false, capture: true }
      const gestureOpts: AddEventListenerOptions = { passive: false }

      // Capture phase so a finger on a movie label still counts toward pinch.
      capturedSlot.addEventListener('pointerdown', onPointerDown, { capture: true })
      capturedSlot.addEventListener('pointermove', onPointerMove)
      capturedSlot.addEventListener('pointerup', onPointerUp)
      capturedSlot.addEventListener('pointercancel', onPointerUp)
      gestureRoot.addEventListener('touchstart', onTouchStart, touchOpts)
      gestureRoot.addEventListener('touchmove', onTouchMove, touchOpts)
      gestureRoot.addEventListener('touchend', onTouchEnd, touchOpts)
      gestureRoot.addEventListener('touchcancel', onTouchCancel, touchOpts)
      gestureRoot.addEventListener('gesturestart', onWebkitGestureStart, gestureOpts)
      gestureRoot.addEventListener('gesturechange', onWebkitGestureChange, gestureOpts)
      gestureRoot.addEventListener('gestureend', onWebkitGestureEnd, gestureOpts)

      return () => {
        cancelEmptyTap()
        capturedSlot.removeEventListener('pointerdown', onPointerDown, { capture: true })
        capturedSlot.removeEventListener('pointermove', onPointerMove)
        capturedSlot.removeEventListener('pointerup', onPointerUp)
        capturedSlot.removeEventListener('pointercancel', onPointerUp)
        gestureRoot.removeEventListener('touchstart', onTouchStart, touchOpts)
        gestureRoot.removeEventListener('touchmove', onTouchMove, touchOpts)
        gestureRoot.removeEventListener('touchend', onTouchEnd, touchOpts)
        gestureRoot.removeEventListener('touchcancel', onTouchCancel, touchOpts)
        gestureRoot.removeEventListener('gesturestart', onWebkitGestureStart, gestureOpts)
        gestureRoot.removeEventListener('gesturechange', onWebkitGestureChange, gestureOpts)
        gestureRoot.removeEventListener('gestureend', onWebkitGestureEnd, gestureOpts)
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

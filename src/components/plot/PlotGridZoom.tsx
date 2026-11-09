import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'
import {
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

const PAN_DEAD_ZONE_PX = 22
const PAN_SLOP_PX = 8
const DOUBLE_TAP_MS = 350
const DOUBLE_TAP_PX = 28

type Props = { children: React.ReactNode }

export const PlotGridZoom = forwardRef<HTMLDivElement, Props>(
  function PlotGridZoom({ children }, forwardedRef) {
    const slotRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLDivElement | null>(null)
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

    useImperativeHandle(forwardedRef, () => gridRef.current as HTMLDivElement)

    function applyTransform() {
      const canvas = canvasRef.current
      const slot = slotRef.current
      if (!canvas) return
      if (slot) {
        stateRef.current = clampToSlot(
          stateRef.current,
          { width: slot.offsetWidth, height: slot.offsetHeight },
          { width: canvas.offsetWidth, height: canvas.offsetHeight },
        )
      }
      const { scale, tx, ty } = stateRef.current
      canvas.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
      canvas.style.setProperty('--plot-scale', String(scale))
      slot?.classList.toggle(
        'grid-zoom-slot--zoomed',
        scale >= LABELS_VISIBLE_SCALE,
      )
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

    // One-finger pan on empty space; two-finger pinch-zoom on touch devices.
    // Double-tap toggles fit vs a 2.2x zoom toward the tap (one-handed iPhone
    // zoom, and a way back after pinch). Mouse/pen use Pointer Events. Touch
    // uses Touch Events because iOS Safari does not deliver pointerdown for a
    // second finger, so pointer-only pinch never starts on iPhone. Skipping
    // pointer capture for touch also keeps the first finger from eating the
    // rest of the gesture.
    useEffect(() => {
      const slot = slotRef.current
      if (!slot) return
      const capturedSlot = slot

      function slotPoint(clientX: number, clientY: number): PointerPos {
        const rect = capturedSlot.getBoundingClientRect()
        return { x: clientX - rect.left, y: clientY - rect.top }
      }

      function isNearMoviePoint(clientX: number, clientY: number) {
        for (const pt of capturedSlot.querySelectorAll('.movie-point')) {
          const r = pt.getBoundingClientRect()
          const dx = clientX - (r.left + r.width / 2)
          const dy = clientY - (r.top + r.height / 2)
          if (dx * dx + dy * dy < PAN_DEAD_ZONE_PX * PAN_DEAD_ZONE_PX) return true
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
        if (!sizes || !canPan(stateRef.current, sizes.slot, sizes.canvas)) return
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
          lastTapRef.current = null
          applyDoubleTap(slotPoint(clientX, clientY))
          return true
        }
        lastTapRef.current = { t: now, x: clientX, y: clientY }
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

        const target = e.target as Element | null
        if (target?.closest('.movie-point')) return
        if (isNearMoviePoint(e.clientX, e.clientY)) return

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
        noteGestureStart(touch.clientX, touch.clientY)
        const target = e.target as Element | null
        if (target?.closest('.movie-point')) return
        if (isNearMoviePoint(touch.clientX, touch.clientY)) return
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
        // Finger started on a movie; still track travel so a hold-to-drag
        // is not mistaken for a double-tap zoom. Empty-space jitter at fit
        // must not count, or a double-tap to zoom in never fires.
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
        lastTapRef.current = null
        endTouchGesture()
      }

      function preventNativeGesture(e: Event) {
        e.preventDefault()
      }

      const touchOpts: AddEventListenerOptions = { passive: false, capture: true }

      // Capture phase so a finger on a movie label still counts toward pinch.
      capturedSlot.addEventListener('pointerdown', onPointerDown, { capture: true })
      capturedSlot.addEventListener('pointermove', onPointerMove)
      capturedSlot.addEventListener('pointerup', onPointerUp)
      capturedSlot.addEventListener('pointercancel', onPointerUp)
      capturedSlot.addEventListener('touchstart', onTouchStart, touchOpts)
      capturedSlot.addEventListener('touchmove', onTouchMove, touchOpts)
      capturedSlot.addEventListener('touchend', onTouchEnd, touchOpts)
      capturedSlot.addEventListener('touchcancel', onTouchCancel, touchOpts)
      // Safari page-zoom gestures fight custom pinch unless they are cancelled.
      capturedSlot.addEventListener('gesturestart', preventNativeGesture)
      capturedSlot.addEventListener('gesturechange', preventNativeGesture)
      capturedSlot.addEventListener('gestureend', preventNativeGesture)

      return () => {
        capturedSlot.removeEventListener('pointerdown', onPointerDown, { capture: true })
        capturedSlot.removeEventListener('pointermove', onPointerMove)
        capturedSlot.removeEventListener('pointerup', onPointerUp)
        capturedSlot.removeEventListener('pointercancel', onPointerUp)
        capturedSlot.removeEventListener('touchstart', onTouchStart, touchOpts)
        capturedSlot.removeEventListener('touchmove', onTouchMove, touchOpts)
        capturedSlot.removeEventListener('touchend', onTouchEnd, touchOpts)
        capturedSlot.removeEventListener('touchcancel', onTouchCancel, touchOpts)
        capturedSlot.removeEventListener('gesturestart', preventNativeGesture)
        capturedSlot.removeEventListener('gesturechange', preventNativeGesture)
        capturedSlot.removeEventListener('gestureend', preventNativeGesture)
      }
    }, [])

    return (
      <div ref={slotRef} className="grid-zoom-slot">
        <div ref={canvasRef} className="grid-zoom-canvas">
          <div ref={gridRef} className="grid">
            {children}
          </div>
        </div>
      </div>
    )
  },
)

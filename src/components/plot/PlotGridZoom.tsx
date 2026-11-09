import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'
import {
  INITIAL_SCALE,
  centeredTransform,
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

    useImperativeHandle(forwardedRef, () => gridRef.current as HTMLDivElement)

    function applyTransform() {
      const canvas = canvasRef.current
      if (!canvas) return
      const { scale, tx, ty } = stateRef.current
      canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
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

      function beginPinch() {
        const pair = activePair()
        if (!pair) return
        panRef.current = null
        capturedSlot.style.cursor = ''
        pinchRef.current = {
          origin: { ...stateRef.current },
          originMidpoint: pointerMidpoint(pair[0], pair[1]),
          originDistance: pointerDistance(pair[0], pair[1]),
        }
      }

      function onPointerDown(e: PointerEvent) {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        pointersRef.current.set(e.pointerId, slotPoint(e.clientX, e.clientY))
        capturePointer(e.pointerId)

        if (pointersRef.current.size >= 2) {
          e.preventDefault()
          beginPinch()
          return
        }

        const target = e.target as Element | null
        if (target?.closest('.movie-point')) return
        if (isNearMoviePoint(e.clientX, e.clientY)) return

        panRef.current = {
          pointerId: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          tx: stateRef.current.tx,
          ty: stateRef.current.ty,
        }
        capturedSlot.style.cursor = 'grabbing'
      }

      function onPointerMove(e: PointerEvent) {
        if (!pointersRef.current.has(e.pointerId)) return
        pointersRef.current.set(e.pointerId, slotPoint(e.clientX, e.clientY))

        if (pinchRef.current && pointersRef.current.size >= 2) {
          e.preventDefault()
          const pair = activePair()
          if (!pair) return
          const pinch = pinchRef.current
          stateRef.current = pinchTransform(
            pinch.origin,
            pinch.originMidpoint,
            pinch.originDistance,
            pointerMidpoint(pair[0], pair[1]),
            pointerDistance(pair[0], pair[1]),
          )
          userTransformedRef.current = true
          applyTransform()
          return
        }

        if (!panRef.current || panRef.current.pointerId !== e.pointerId) return
        const dx = e.clientX - panRef.current.x
        const dy = e.clientY - panRef.current.y
        stateRef.current.tx = panRef.current.tx + dx
        stateRef.current.ty = panRef.current.ty + dy
        userTransformedRef.current = true
        applyTransform()
      }

      function onPointerUp(e: PointerEvent) {
        if (!pointersRef.current.has(e.pointerId)) return
        pointersRef.current.delete(e.pointerId)
        if (panRef.current?.pointerId === e.pointerId) {
          panRef.current = null
          capturedSlot.style.cursor = ''
        }
        if (pinchRef.current) {
          if (pointersRef.current.size >= 2) {
            beginPinch()
          } else {
            pinchRef.current = null
          }
        }
      }

      function preventNativeGesture(e: Event) {
        e.preventDefault()
      }

      // Capture phase so a finger on a movie label still counts toward pinch.
      capturedSlot.addEventListener('pointerdown', onPointerDown, { capture: true })
      capturedSlot.addEventListener('pointermove', onPointerMove)
      capturedSlot.addEventListener('pointerup', onPointerUp)
      capturedSlot.addEventListener('pointercancel', onPointerUp)
      // Safari page-zoom gestures fight custom pinch unless they are cancelled.
      capturedSlot.addEventListener('gesturestart', preventNativeGesture)
      capturedSlot.addEventListener('gesturechange', preventNativeGesture)
      capturedSlot.addEventListener('gestureend', preventNativeGesture)

      return () => {
        capturedSlot.removeEventListener('pointerdown', onPointerDown, { capture: true })
        capturedSlot.removeEventListener('pointermove', onPointerMove)
        capturedSlot.removeEventListener('pointerup', onPointerUp)
        capturedSlot.removeEventListener('pointercancel', onPointerUp)
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

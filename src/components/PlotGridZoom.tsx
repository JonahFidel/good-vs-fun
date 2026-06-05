import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'

type ZoomState = {
  scale: number
  tx: number
  ty: number
}

type PanStart = {
  x: number
  y: number
  tx: number
  ty: number
}

// The grid element is natively a 0–12 canvas; gridlines and tick marks are
// drawn only within the 0–10 scoring region (see .grid::before in CSS).
const INITIAL_SCALE = 1
const MIN_SCALE = 0.3
const MAX_SCALE = 8

type Props = { children: React.ReactNode }

export const PlotGridZoom = forwardRef<HTMLDivElement, Props>(
  function PlotGridZoom({ children }, forwardedRef) {
    const slotRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLDivElement | null>(null)
    const gridRef = useRef<HTMLDivElement | null>(null)
    const stateRef = useRef<ZoomState>({ scale: INITIAL_SCALE, tx: 0, ty: 0 })
    const panRef = useRef<PanStart | null>(null)

    useImperativeHandle(forwardedRef, () => gridRef.current as HTMLDivElement)

    function applyTransform() {
      const canvas = canvasRef.current
      if (!canvas) return
      const { scale, tx, ty } = stateRef.current
      canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
    }

    useLayoutEffect(() => {
      const slot = slotRef.current
      if (!slot) return
      const H = slot.offsetHeight
      stateRef.current = { scale: INITIAL_SCALE, tx: 0, ty: H * (1 - INITIAL_SCALE) }
      applyTransform()
    }, [])

    // Re-anchor on slot resize.
    useEffect(() => {
      const slot = slotRef.current
      if (!slot) return
      const ro = new ResizeObserver(() => {
        const H = slot.offsetHeight
        const { scale } = stateRef.current
        stateRef.current.ty = H * (1 - scale)
        stateRef.current.tx = 0
        applyTransform()
      })
      ro.observe(slot)
      return () => ro.disconnect()
    }, [])

    // Cmd/Ctrl + scroll → zoom toward cursor
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

        const { scale: oldScale, tx, ty } = stateRef.current
        const rect = capturedSlot.getBoundingClientRect()
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top

        const delta =
          e.deltaMode === 1 ? e.deltaY * 30 : e.deltaMode === 2 ? e.deltaY * 300 : e.deltaY
        const factor = Math.exp(-delta / 800)
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * factor))

        const ratio = newScale / oldScale
        const newTx = cursorX - (cursorX - tx) * ratio
        const newTy = cursorY - (cursorY - ty) * ratio

        stateRef.current = { scale: newScale, tx: newTx, ty: newTy }
        applyTransform()
      }

      // { passive: false } is required so we can call preventDefault() and
      // suppress both native page-scroll and OS-level pinch-zoom.
      capturedSlot.addEventListener('wheel', onWheel, { passive: false })
      return () => capturedSlot.removeEventListener('wheel', onWheel)
    }, [])

    // Pointer drag on empty grid space → pan
    const PAN_DEAD_ZONE_PX = 22

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (e.button !== 0) return
      // Don't pan when clicking on or near a movie point
      if ((e.target as Element).closest('.movie-point')) return
      const slot = slotRef.current
      if (slot) {
        for (const pt of slot.querySelectorAll('.movie-point')) {
          const r = pt.getBoundingClientRect()
          const dx = e.clientX - (r.left + r.width / 2)
          const dy = e.clientY - (r.top + r.height / 2)
          if (dx * dx + dy * dy < PAN_DEAD_ZONE_PX * PAN_DEAD_ZONE_PX) return
        }
      }

      e.currentTarget.setPointerCapture(e.pointerId)
      panRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: stateRef.current.tx,
        ty: stateRef.current.ty,
      }
      if (slotRef.current) slotRef.current.style.cursor = 'grabbing'
    }

    function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
      if (!panRef.current) return
      const dx = e.clientX - panRef.current.x
      const dy = e.clientY - panRef.current.y
      stateRef.current.tx = panRef.current.tx + dx
      stateRef.current.ty = panRef.current.ty + dy
      applyTransform()
    }

    function handlePointerUp() {
      if (!panRef.current) return
      panRef.current = null
      if (slotRef.current) slotRef.current.style.cursor = ''
    }

    return (
      <div
        ref={slotRef}
        className="grid-zoom-slot"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div ref={canvasRef} className="grid-zoom-canvas">
          <div ref={gridRef} className="grid">
            {children}
          </div>
        </div>
      </div>
    )
  },
)

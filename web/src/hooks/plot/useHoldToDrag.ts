import { useCallback, useEffect, useState, type PointerEvent } from 'react'

export type PlotDrag = {
  type: 'group' | 'single'
  key: string
  ids: string[]
  origin: 'grid' | 'list'
}

type PendingPointer = {
  primaryId: string
  drag: PlotDrag
  x: number
  y: number
  startedAt: number
}

/** Pointer must stay down this long before movement counts as a drag. */
export const DRAG_HOLD_MS = 120

/** Movement past this distance, after the hold, starts a drag instead of a click. */
const DRAG_MOVE_PX = 12

/**
 * Movement during the hold is a pan, not a click or drag. Must match
 * PlotGridZoom PAN_SLOP_PX so a drag on a Figma-scaled title pans the
 * zoomed grid instead of waiting out the hold and then moving the movie.
 */
const PAN_CANCEL_PX = 8

export function useHoldToDrag({
  isExampleDeck,
  onSelectMovie,
  onDragStart,
}: {
  isExampleDeck: boolean
  onSelectMovie: (id: string) => void
  onDragStart: (drag: PlotDrag, point: { x: number; y: number }) => void
}) {
  const [pendingPointer, setPendingPointer] = useState<PendingPointer | null>(null)

  const beginPendingPointer = useCallback(
    (primaryId: string, drag: PlotDrag, event: PointerEvent) => {
      event.preventDefault()
      if (isExampleDeck) {
        onSelectMovie(primaryId)
        return
      }
      setPendingPointer({
        primaryId,
        drag,
        x: event.clientX,
        y: event.clientY,
        startedAt: performance.now(),
      })
    },
    [isExampleDeck, onSelectMovie],
  )

  useEffect(() => {
    if (!pendingPointer) {
      return
    }

    let dragStarted = false
    let panCancelled = false

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (dragStarted || panCancelled) {
        return
      }
      const dist = Math.hypot(
        event.clientX - pendingPointer.x,
        event.clientY - pendingPointer.y,
      )
      if (performance.now() - pendingPointer.startedAt < DRAG_HOLD_MS) {
        // Grid early movement is a pan, not a click or drag. List-to-grid
        // drag still ignores travel during the hold so a press-and-pull
        // from the sidebar can start after 120ms. Drop without selecting
        // even if pointerup arrives before React re-renders this effect.
        if (
          pendingPointer.drag.origin === 'grid' &&
          dist >= PAN_CANCEL_PX
        ) {
          panCancelled = true
          setPendingPointer(null)
        }
        return
      }
      if (dist < DRAG_MOVE_PX) {
        return
      }

      dragStarted = true
      onDragStart(pendingPointer.drag, { x: event.clientX, y: event.clientY })
      setPendingPointer(null)
    }

    const handlePointerUp = () => {
      if (!dragStarted && !panCancelled) {
        onSelectMovie(pendingPointer.primaryId)
      }
      setPendingPointer(null)
    }

    const handleSecondPointer = () => {
      // A second finger means pinch-zoom, not a movie drag.
      setPendingPointer(null)
    }

    const handleSecondTouch = (event: TouchEvent) => {
      // iOS Safari does not fire pointerdown for the second finger.
      if (event.touches.length >= 2) {
        setPendingPointer(null)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerdown', handleSecondPointer)
    window.addEventListener('touchstart', handleSecondTouch, { passive: true })
    window.addEventListener('pointerup', handlePointerUp, { once: true })
    window.addEventListener('pointercancel', handlePointerUp, { once: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handleSecondPointer)
      window.removeEventListener('touchstart', handleSecondTouch)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [onDragStart, onSelectMovie, pendingPointer])

  return { beginPendingPointer }
}

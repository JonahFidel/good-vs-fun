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
const DRAG_HOLD_MS = 120

/** Movement past this distance, after the hold, starts a drag instead of a click. */
const DRAG_MOVE_PX = 12

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

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (dragStarted) {
        return
      }
      if (performance.now() - pendingPointer.startedAt < DRAG_HOLD_MS) {
        return
      }
      const dx = event.clientX - pendingPointer.x
      const dy = event.clientY - pendingPointer.y
      if (Math.hypot(dx, dy) < DRAG_MOVE_PX) {
        return
      }

      dragStarted = true
      onDragStart(pendingPointer.drag, { x: event.clientX, y: event.clientY })
      setPendingPointer(null)
    }

    const handlePointerUp = () => {
      if (!dragStarted) {
        onSelectMovie(pendingPointer.primaryId)
      }
      setPendingPointer(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
    window.addEventListener('pointercancel', handlePointerUp, { once: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [onDragStart, onSelectMovie, pendingPointer])

  return { beginPendingPointer }
}

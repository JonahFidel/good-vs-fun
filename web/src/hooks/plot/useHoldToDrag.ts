import { useCallback, useEffect, useState, type PointerEvent } from 'react'
import { crossedMovieDragThreshold } from '../../lib/plotDragGesture'

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
}

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
      if (
        !crossedMovieDragThreshold(
          pendingPointer.x,
          pendingPointer.y,
          event.clientX,
          event.clientY,
        )
      ) {
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

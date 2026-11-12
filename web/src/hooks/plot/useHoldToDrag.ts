import { useCallback, useEffect, useState, type PointerEvent } from 'react'
import { trackPendingMoviePointer } from '../../lib/plotDragGesture'

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

    return trackPendingMoviePointer(window, pendingPointer, {
      onDragStart: (point) => {
        onDragStart(pendingPointer.drag, point)
        setPendingPointer(null)
      },
      onClick: () => {
        onSelectMovie(pendingPointer.primaryId)
        setPendingPointer(null)
      },
      onCancel: () => setPendingPointer(null),
    })
  }, [onDragStart, onSelectMovie, pendingPointer])

  return { beginPendingPointer }
}

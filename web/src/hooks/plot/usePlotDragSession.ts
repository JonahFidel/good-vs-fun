import { useCallback, useEffect, useRef } from 'react'
import { findSnapTarget, type PlotScore } from '../../lib/findSnapTarget'
import type { Movie } from '../../lib/types'
import type { PlotDrag } from './useHoldToDrag'

/**
 * Tracks the pointer while a plot drag is active and commits or discards it
 * on release. A list drag that never enters the grid is discarded.
 */
export function usePlotDragSession({
  dragging,
  gridRef,
  moviesRef,
  updateMoviePosition,
  applyMovieScores,
  persistMoviePositions,
  discardDragSnapshot,
  recordUndoIfChanged,
  onDragEnd,
}: {
  dragging: PlotDrag | null
  gridRef: { current: HTMLDivElement | null }
  moviesRef: { current: Movie[] }
  updateMoviePosition: (dragging: PlotDrag, clientX: number, clientY: number) => void
  applyMovieScores: (ids: string[], fun: number, good: number) => void
  persistMoviePositions: (ids: string[], override?: PlotScore) => void
  discardDragSnapshot: () => void
  recordUndoIfChanged: () => void
  onDragEnd: () => void
}) {
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const lastInGridPointerRef = useRef<{ x: number; y: number } | null>(null)

  const notePointer = useCallback((point: { x: number; y: number }) => {
    lastPointerRef.current = point
  }, [])

  useEffect(() => {
    if (!dragging) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(dragging, event.clientX, event.clientY)

      if (dragging.origin === 'list') {
        const grid = gridRef.current
        if (!grid) {
          return
        }
        const rect = grid.getBoundingClientRect()
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          lastInGridPointerRef.current = { x: event.clientX, y: event.clientY }
        }
      }
    }

    const handlePointerUp = () => {
      const last =
        dragging.origin === 'list' ? lastInGridPointerRef.current : lastPointerRef.current

      // If you dragged from the list but never entered the grid: no change.
      if (dragging.origin === 'list' && !last) {
        discardDragSnapshot()
        onDragEnd()
        return
      }

      const snapTarget = last
        ? findSnapTarget(gridRef.current, moviesRef.current, dragging, last.x, last.y)
        : null
      if (snapTarget) {
        applyMovieScores(dragging.ids, snapTarget.fun, snapTarget.good)
        persistMoviePositions(dragging.ids, snapTarget)
      } else {
        persistMoviePositions(dragging.ids)
      }
      recordUndoIfChanged()
      onDragEnd()
      lastInGridPointerRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [
    applyMovieScores,
    discardDragSnapshot,
    dragging,
    gridRef,
    moviesRef,
    onDragEnd,
    persistMoviePositions,
    recordUndoIfChanged,
    updateMoviePosition,
  ])

  return { notePointer }
}

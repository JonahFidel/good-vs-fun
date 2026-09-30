import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react'
import { snapScoreToStep } from '../lib/format'
import { findSnapTarget, scoresAtPointer } from '../lib/findSnapTarget'
import type { Movie } from '../lib/types'
import { useHoldToDrag, type PlotDrag } from './useHoldToDrag'

type Score = {
  fun: number
  good: number
}

export function usePlotDrag({
  isExampleDeck,
  moviesRef,
  setMovies,
  persistMoviePositions,
  captureDragSnapshot,
  discardDragSnapshot,
  recordUndoIfChanged,
  onSelectMovie,
}: {
  isExampleDeck: boolean
  moviesRef: { current: Movie[] }
  setMovies: Dispatch<SetStateAction<Movie[]>>
  persistMoviePositions: (ids: string[], override?: Score) => void
  captureDragSnapshot: (ids: string[]) => void
  discardDragSnapshot: () => void
  recordUndoIfChanged: () => void
  onSelectMovie: (id: string) => void
}) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const lastInGridPointerRef = useRef<{ x: number; y: number } | null>(null)
  const [draggingGroup, setDraggingGroup] = useState<PlotDrag | null>(null)

  const applyMovieScores = useCallback(
    (ids: string[], fun: number, good: number) => {
      const nextFun = snapScoreToStep(fun)
      const nextGood = snapScoreToStep(good)
      const idSet = new Set(ids)

      setMovies((current) => {
        const next = current.map((movie) =>
          idSet.has(movie.id)
            ? {
                ...movie,
                fun: nextFun,
                good: nextGood,
              }
            : movie,
        )
        moviesRef.current = next
        return next
      })
    },
    [moviesRef, setMovies],
  )

  const updateMoviePosition = useCallback(
    (dragging: PlotDrag, clientX: number, clientY: number) => {
      const grid = gridRef.current
      if (!grid) {
        return
      }
      const rect = grid.getBoundingClientRect()

      // Key fix: if you're dragging from the left list, do nothing until you
      // actually enter the grid (prevents jump-to-edge like 0,0).
      if (
        dragging.origin === 'list' &&
        (clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom)
      ) {
        return
      }

      const { fun, good } = scoresAtPointer(grid, clientX, clientY)
      applyMovieScores(dragging.ids, fun, good)
    },
    [applyMovieScores],
  )

  const startDrag = useCallback(
    (drag: PlotDrag, point: { x: number; y: number }) => {
      captureDragSnapshot(drag.ids)
      setDraggingGroup(drag)
      lastPointerRef.current = point
      updateMoviePosition(drag, point.x, point.y)
    },
    [captureDragSnapshot, updateMoviePosition],
  )

  const { beginPendingPointer } = useHoldToDrag({
    isExampleDeck,
    onSelectMovie,
    onDragStart: startDrag,
  })

  const handlePointerDown =
    (key: string, ids: string[], primaryId: string) =>
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return
      }
      beginPendingPointer(
        primaryId,
        { type: 'group', key, ids, origin: 'grid' },
        event,
      )
    }

  const handleLabelPointerDown =
    (id: string) => (event: ReactPointerEvent<HTMLSpanElement>) => {
      event.stopPropagation()
      beginPendingPointer(
        id,
        { type: 'single', key: id, ids: [id], origin: 'grid' },
        event,
      )
    }

  const handleMovieListPointerDown =
    (id: string) => (event: ReactPointerEvent<HTMLLIElement>) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('button')) {
        return
      }
      beginPendingPointer(
        id,
        { type: 'single', key: id, ids: [id], origin: 'list' },
        event,
      )
    }

  useEffect(() => {
    if (!draggingGroup) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(draggingGroup, event.clientX, event.clientY)

      if (draggingGroup.origin === 'list') {
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
        draggingGroup.origin === 'list'
          ? lastInGridPointerRef.current
          : lastPointerRef.current

      // If you dragged from the list but never entered the grid: no change.
      if (draggingGroup.origin === 'list' && !last) {
        discardDragSnapshot()
        setDraggingGroup(null)
        return
      }

      const snapTarget = last
        ? findSnapTarget(
            gridRef.current,
            moviesRef.current,
            draggingGroup,
            last.x,
            last.y,
          )
        : null
      if (snapTarget) {
        applyMovieScores(draggingGroup.ids, snapTarget.fun, snapTarget.good)
        persistMoviePositions(draggingGroup.ids, snapTarget)
      } else {
        persistMoviePositions(draggingGroup.ids)
      }
      recordUndoIfChanged()
      setDraggingGroup(null)
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
    draggingGroup,
    moviesRef,
    persistMoviePositions,
    recordUndoIfChanged,
    updateMoviePosition,
  ])

  return {
    gridRef,
    draggingIds: draggingGroup?.ids ?? null,
    handlePointerDown,
    handleLabelPointerDown,
    handleMovieListPointerDown,
  }
}

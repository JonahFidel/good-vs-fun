import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react'
import { snapScoreToStep } from '../../lib/format'
import { scoresAtPointer } from '../../lib/findSnapTarget'
import type { Movie } from '../../lib/types'
import { useHoldToDrag, type PlotDrag } from './useHoldToDrag'
import { usePlotDragSession } from './usePlotDragSession'

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

  const endDrag = useCallback(() => {
    setDraggingGroup(null)
  }, [])

  const { notePointer } = usePlotDragSession({
    dragging: draggingGroup,
    gridRef,
    moviesRef,
    updateMoviePosition,
    applyMovieScores,
    persistMoviePositions,
    discardDragSnapshot,
    recordUndoIfChanged,
    onDragEnd: endDrag,
  })

  const startDrag = useCallback(
    (drag: PlotDrag, point: { x: number; y: number }) => {
      captureDragSnapshot(drag.ids)
      setDraggingGroup(drag)
      notePointer(point)
      updateMoviePosition(drag, point.x, point.y)
    },
    [captureDragSnapshot, notePointer, updateMoviePosition],
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

  return {
    gridRef,
    draggingIds: draggingGroup?.ids ?? null,
    handlePointerDown,
    handleLabelPointerDown,
    handleMovieListPointerDown,
  }
}

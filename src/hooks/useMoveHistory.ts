import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useApiFetch } from '../lib/api'
import { snapScoreToStep } from '../lib/format'
import type { Movie } from '../lib/types'

type MoviePosition = {
  id: string
  fun: number
  good: number
}

type Move = {
  before: MoviePosition[]
  after: MoviePosition[]
}

function positionsDiffer(before: MoviePosition[], movies: Movie[]) {
  return before.some((entry) => {
    const movie = movies.find((item) => item.id === entry.id)
    if (!movie) {
      return false
    }
    return (
      snapScoreToStep(movie.fun) !== snapScoreToStep(entry.fun) ||
      snapScoreToStep(movie.good) !== snapScoreToStep(entry.good)
    )
  })
}

function positionsAfter(before: MoviePosition[], movies: Movie[]): MoviePosition[] {
  return before.map((entry) => {
    const movie = movies.find((item) => item.id === entry.id)
    return movie ? { id: movie.id, fun: movie.fun, good: movie.good } : entry
  })
}

export function useMoveHistory({
  deckId,
  isExampleDeck,
  moviesRef,
  setMovies,
  setError,
}: {
  deckId: string | null
  isExampleDeck: boolean
  moviesRef: { current: Movie[] }
  setMovies: Dispatch<SetStateAction<Movie[]>>
  setError: Dispatch<SetStateAction<string | null>>
}) {
  const apiFetch = useApiFetch()
  const [trackedDeckId, setTrackedDeckId] = useState(deckId)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const dragStartSnapshotRef = useRef<MoviePosition[] | null>(null)
  const lastMoveRef = useRef<Move | null>(null)

  if (deckId !== trackedDeckId) {
    setTrackedDeckId(deckId)
    setCanUndo(false)
    setCanRedo(false)
  }

  useEffect(() => {
    dragStartSnapshotRef.current = null
    lastMoveRef.current = null
  }, [deckId])

  const captureDragSnapshot = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    dragStartSnapshotRef.current = moviesRef.current
      .filter((movie) => idSet.has(movie.id))
      .map((movie) => ({ id: movie.id, fun: movie.fun, good: movie.good }))
  }, [moviesRef])

  const discardDragSnapshot = useCallback(() => {
    dragStartSnapshotRef.current = null
  }, [])

  const recordUndoIfChanged = useCallback(() => {
    const before = dragStartSnapshotRef.current
    dragStartSnapshotRef.current = null
    if (!before || before.length === 0) {
      return
    }

    const movies = moviesRef.current
    if (!positionsDiffer(before, movies)) {
      return
    }

    lastMoveRef.current = { before, after: positionsAfter(before, movies) }
    setCanUndo(true)
    setCanRedo(false)
  }, [moviesRef])

  const applyPositions = useCallback(
    async (positions: MoviePosition[], errorMessage: string) => {
      if (!deckId || isExampleDeck) {
        return false
      }

      setError(null)
      setMovies((current) => {
        const next = current.map((movie) => {
          const update = positions.find((item) => item.id === movie.id)
          return update ? { ...movie, fun: update.fun, good: update.good } : movie
        })
        moviesRef.current = next
        return next
      })

      try {
        await Promise.all(
          positions.map((movie) => {
            const current = moviesRef.current.find((item) => item.id === movie.id)
            return apiFetch(`/api/decks/${deckId}/movies/${movie.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                fun: movie.fun,
                good: movie.good,
                title: current?.title ?? '',
              }),
            })
          }),
        )
        return true
      } catch {
        setError(errorMessage)
        return false
      }
    },
    [apiFetch, deckId, isExampleDeck, moviesRef, setError, setMovies],
  )

  const undo = useCallback(async () => {
    const entry = lastMoveRef.current
    if (!entry || !canUndo) {
      return
    }

    const ok = await applyPositions(entry.before, 'Failed to undo move.')
    if (ok) {
      setCanUndo(false)
      setCanRedo(true)
    }
  }, [applyPositions, canUndo])

  const redo = useCallback(async () => {
    const entry = lastMoveRef.current
    if (!entry || !canRedo) {
      return
    }

    const ok = await applyPositions(entry.after, 'Failed to redo move.')
    if (ok) {
      setCanUndo(true)
      setCanRedo(false)
    }
  }, [applyPositions, canRedo])

  return {
    canUndo,
    canRedo,
    captureDragSnapshot,
    discardDragSnapshot,
    recordUndoIfChanged,
    undo,
    redo,
  }
}

import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useApiFetch } from '../lib/api'
import { alertExampleDeckReadOnly } from '../lib/exampleDeck'
import { formatTitle, snapScoreToStep } from '../lib/format'
import type { Movie } from '../lib/types'

export function useSelectedMovieActions({
  deckId,
  isExampleDeck,
  moviesRef,
  setMovies,
  setError,
  selectedMovieId,
  persistMoviePositions,
  removeMovie,
  captureDragSnapshot,
  recordUndoIfChanged,
}: {
  deckId: string | null
  isExampleDeck: boolean
  moviesRef: { current: Movie[] }
  setMovies: Dispatch<SetStateAction<Movie[]>>
  setError: Dispatch<SetStateAction<string | null>>
  selectedMovieId: string | null
  persistMoviePositions: (ids: string[]) => Promise<void>
  removeMovie: (id: string) => Promise<void>
  captureDragSnapshot: (ids: string[]) => void
  recordUndoIfChanged: () => void
}) {
  const apiFetch = useApiFetch()

  const updateMovieAxisScore = useCallback(
    (id: string, axis: 'fun' | 'good', value: number) => {
      const snapped = snapScoreToStep(value)
      setMovies((current) => {
        const next = current.map((movie) =>
          movie.id === id ? { ...movie, [axis]: snapped } : movie,
        )
        moviesRef.current = next
        return next
      })
    },
    [moviesRef, setMovies],
  )

  const handleDeleteSelected = useCallback(() => {
    if (!selectedMovieId) {
      return
    }
    void removeMovie(selectedMovieId)
  }, [removeMovie, selectedMovieId])

  const handleRenameSelected = useCallback(async () => {
    if (!selectedMovieId || !deckId) {
      return
    }
    if (isExampleDeck) {
      alertExampleDeckReadOnly()
      return
    }

    const current = moviesRef.current.find((movie) => movie.id === selectedMovieId)
    if (!current) {
      return
    }

    const nextTitle = window.prompt('Rename movie', current.title)
    if (!nextTitle) {
      return
    }

    const formattedTitle = formatTitle(nextTitle.trim())
    if (!formattedTitle || formattedTitle === current.title) {
      return
    }

    setError(null)
    try {
      await apiFetch(`/api/decks/${deckId}/movies/${selectedMovieId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: formattedTitle,
          fun: current.fun,
          good: current.good,
        }),
      })
      setMovies((movies) =>
        movies.map((movie) =>
          movie.id === selectedMovieId ? { ...movie, title: formattedTitle } : movie,
        ),
      )
    } catch {
      setError('Failed to rename movie.')
    }
  }, [
    apiFetch,
    deckId,
    isExampleDeck,
    moviesRef,
    selectedMovieId,
    setError,
    setMovies,
  ])

  const handleSelectedScoreAdjustStart = useCallback(() => {
    if (!selectedMovieId || isExampleDeck) {
      return
    }
    captureDragSnapshot([selectedMovieId])
  }, [captureDragSnapshot, isExampleDeck, selectedMovieId])

  const handleSelectedScoreCommit = useCallback(async () => {
    if (!selectedMovieId || isExampleDeck) {
      return
    }
    await persistMoviePositions([selectedMovieId])
    recordUndoIfChanged()
  }, [isExampleDeck, persistMoviePositions, recordUndoIfChanged, selectedMovieId])

  const handleSelectedFunChange = useCallback(
    (value: number) => {
      if (!selectedMovieId) {
        return
      }
      if (isExampleDeck) {
        alertExampleDeckReadOnly()
        return
      }
      updateMovieAxisScore(selectedMovieId, 'fun', value)
    },
    [isExampleDeck, selectedMovieId, updateMovieAxisScore],
  )

  const handleSelectedGoodChange = useCallback(
    (value: number) => {
      if (!selectedMovieId) {
        return
      }
      if (isExampleDeck) {
        alertExampleDeckReadOnly()
        return
      }
      updateMovieAxisScore(selectedMovieId, 'good', value)
    },
    [isExampleDeck, selectedMovieId, updateMovieAxisScore],
  )

  return {
    handleDeleteSelected,
    handleRenameSelected,
    handleSelectedScoreAdjustStart,
    handleSelectedScoreCommit,
    handleSelectedFunChange,
    handleSelectedGoodChange,
  }
}

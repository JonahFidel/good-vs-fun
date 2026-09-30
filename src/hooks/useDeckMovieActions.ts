import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useApiFetch } from '../lib/api'
import { alertExampleDeckReadOnly } from '../lib/exampleDeck'
import { formatTitle, snapScoreToStep } from '../lib/format'
import type { Movie } from '../lib/types'

type ScoreOverride = {
  fun: number
  good: number
}

export function useDeckMovieActions({
  deckId,
  isExampleDeck,
  moviesRef,
  setMovies,
  setError,
  setLoading,
  selectedMovieId,
  setSelectedMovieId,
  captureDragSnapshot,
  recordUndoIfChanged,
}: {
  deckId: string | null
  isExampleDeck: boolean
  moviesRef: { current: Movie[] }
  setMovies: Dispatch<SetStateAction<Movie[]>>
  setError: Dispatch<SetStateAction<string | null>>
  setLoading: Dispatch<SetStateAction<boolean>>
  selectedMovieId: string | null
  setSelectedMovieId: Dispatch<SetStateAction<string | null>>
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

  const persistMoviePositions = useCallback(
    async (ids: string[], override?: ScoreOverride) => {
      if (!deckId || isExampleDeck) {
        return
      }

      const idSet = new Set(ids)
      const updates = moviesRef.current.filter((movie) => idSet.has(movie.id))

      try {
        await Promise.all(
          updates.map((movie) =>
            apiFetch(`/api/decks/${deckId}/movies/${movie.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                fun: override?.fun ?? movie.fun,
                good: override?.good ?? movie.good,
                title: movie.title,
              }),
            }),
          ),
        )
      } catch {
        setError('Failed to save movie positions.')
      }
    },
    [deckId, apiFetch, isExampleDeck, moviesRef, setError],
  )

  const removeMovie = useCallback(
    async (id: string) => {
      if (!deckId || isExampleDeck) {
        if (isExampleDeck) {
          alertExampleDeckReadOnly()
        }
        return
      }

      setError(null)
      try {
        await apiFetch(`/api/decks/${deckId}/movies/${id}`, {
          method: 'DELETE',
        })
        setMovies((current) => current.filter((movie) => movie.id !== id))
        setSelectedMovieId((current) => (current === id ? null : current))
      } catch {
        setError('Failed to remove movie.')
      }
    },
    [deckId, apiFetch, isExampleDeck, setError, setMovies, setSelectedMovieId],
  )

  const handleAddMovie = useCallback(
    async (movie: { title: string; fun: number; good: number }) => {
      if (!deckId || isExampleDeck) {
        return false
      }

      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch(`/api/decks/${deckId}/movies`, {
          method: 'POST',
          body: JSON.stringify(movie),
        })
        if (data?.movie) {
          setMovies((current) => [...current, data.movie as Movie])
          return true
        }
        return false
      } catch {
        setError('Failed to add movie.')
        return false
      } finally {
        setLoading(false)
      }
    },
    [apiFetch, deckId, isExampleDeck, setError, setLoading, setMovies],
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
    persistMoviePositions,
    removeMovie,
    handleAddMovie,
    handleDeleteSelected,
    handleRenameSelected,
    handleSelectedScoreAdjustStart,
    handleSelectedScoreCommit,
    handleSelectedFunChange,
    handleSelectedGoodChange,
  }
}

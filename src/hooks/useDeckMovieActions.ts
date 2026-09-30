import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useApiFetch } from '../lib/api'
import { alertExampleDeckReadOnly } from '../lib/exampleDeck'
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
  setSelectedMovieId,
}: {
  deckId: string | null
  isExampleDeck: boolean
  moviesRef: { current: Movie[] }
  setMovies: Dispatch<SetStateAction<Movie[]>>
  setError: Dispatch<SetStateAction<string | null>>
  setLoading: Dispatch<SetStateAction<boolean>>
  setSelectedMovieId: Dispatch<SetStateAction<string | null>>
}) {
  const apiFetch = useApiFetch()

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

  return {
    persistMoviePositions,
    removeMovie,
    handleAddMovie,
  }
}

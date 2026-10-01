import { useEffect, useRef, useState } from 'react'
import { deckPath } from '@good-vs-fun/shared'
import { useApiFetch } from '../../lib/api'
import type { Movie } from '../../lib/types'

export function useDeckLoad(deckId: string | null) {
  const apiFetch = useApiFetch()
  const [deckName, setDeckName] = useState('')
  const [isExampleDeck, setIsExampleDeck] = useState(false)
  const [movies, setMovies] = useState<Movie[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(deckId !== null)
  const [trackedDeckLoad, setTrackedDeckLoad] = useState({
    deckId,
    apiFetch,
  })

  if (
    trackedDeckLoad.deckId !== deckId ||
    trackedDeckLoad.apiFetch !== apiFetch
  ) {
    setTrackedDeckLoad({ deckId, apiFetch })
    if (deckId) {
      setLoading(true)
      setError(null)
    }
  }

  const moviesRef = useRef<Movie[]>([])

  useEffect(() => {
    moviesRef.current = movies
  }, [movies])

  useEffect(() => {
    if (!deckId) {
      return
    }

    let isActive = true

    apiFetch(deckPath(deckId))
      .then((data) => {
        if (!isActive) {
          return
        }
        setDeckName(String(data?.deck?.name ?? ''))
        setIsExampleDeck(Boolean(data?.deck?.isExample))
        setMovies((data?.movies ?? []) as Movie[])
      })
      .catch(() => {
        if (isActive) {
          setError('Failed to load deck.')
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [deckId, apiFetch])

  return {
    deckName,
    isExampleDeck,
    movies,
    setMovies,
    error,
    setError,
    loading,
    setLoading,
    moviesRef,
  }
}

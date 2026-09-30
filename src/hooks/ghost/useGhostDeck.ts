import { useEffect, useState } from 'react'
import { useApiFetch } from '../../lib/api'
import type { Movie } from '../../lib/types'

export function useGhostDeck(deckId: string) {
  const apiFetch = useApiFetch()
  const [trackedDeckId, setTrackedDeckId] = useState(deckId)
  const [movies, setMovies] = useState<Movie[]>([])
  const [name, setName] = useState('')

  if (deckId !== trackedDeckId) {
    setTrackedDeckId(deckId)
    if (!deckId) {
      setMovies([])
      setName('')
    }
  }

  useEffect(() => {
    if (!deckId) {
      return
    }

    let isActive = true
    apiFetch(`/api/decks/${deckId}`)
      .then((data) => {
        if (!isActive) {
          return
        }
        setMovies((data?.movies ?? []) as Movie[])
        setName(String(data?.deck?.name ?? ''))
      })
      .catch(() => {})

    return () => {
      isActive = false
    }
  }, [apiFetch, deckId])

  return { movies, name }
}

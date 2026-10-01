import { ApiRoute, deckPath, type Deck, type Movie } from '@good-vs-fun/shared'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { useApiFetch } from '@/lib/api'
import {
  ghostSelectionAfterPick,
  normalizeGhostSelection,
  swapGhostRoute,
  type GhostSelection,
} from '@/lib/ghostCompare'

type DecksResponse = {
  decks?: Deck[]
}

type DeckDetailResponse = {
  deck?: {
    name?: string
  }
  movies?: Movie[]
}

function useGhostDeck(deckId: string) {
  const apiFetch = useApiFetch()
  const [movies, setMovies] = useState<Movie[]>([])
  const [name, setName] = useState('')

  useEffect(() => {
    if (!deckId) {
      setMovies([])
      setName('')
      return
    }

    let active = true
    apiFetch(deckPath(deckId))
      .then((data) => {
        if (!active) {
          return
        }
        const detail = data as DeckDetailResponse | null
        setMovies(detail?.movies ?? [])
        setName(String(detail?.deck?.name ?? ''))
      })
      .catch(() => {
        if (!active) {
          return
        }
        setMovies([])
        setName('')
      })

    return () => {
      active = false
    }
  }, [apiFetch, deckId])

  return { movies, name }
}

export function useGhostCompare(
  deckId: string,
  initialGhostId = '',
  initialGhost2Id = '',
) {
  const apiFetch = useApiFetch()
  const router = useRouter()
  const [allDecks, setAllDecks] = useState<Deck[]>([])
  const [decksLoaded, setDecksLoaded] = useState(false)
  const [selection, setSelection] = useState<GhostSelection>(() =>
    normalizeGhostSelection(deckId, initialGhostId, initialGhost2Id),
  )
  const ghost = useGhostDeck(selection.ghostId)
  const ghost2 = useGhostDeck(selection.ghost2Id)

  useEffect(() => {
    let active = true
    apiFetch(ApiRoute.decks)
      .then((data) => {
        if (!active) {
          return
        }
        setAllDecks((data as DecksResponse | null)?.decks ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setDecksLoaded(true)
        }
      })

    return () => {
      active = false
    }
  }, [apiFetch])

  const otherDecks = useMemo(
    () => allDecks.filter((deck) => deck.id !== deckId),
    [allDecks, deckId],
  )

  const swap = (slot: 1 | 2) => {
    const params = swapGhostRoute(deckId, selection, slot)
    if (!params) {
      return
    }
    router.replace({
      pathname: '/deck/[deckId]',
      params,
    })
  }

  return {
    decksLoaded,
    otherDecks,
    ghostDeckId: selection.ghostId,
    ghost2DeckId: selection.ghost2Id,
    ghostDeckName: ghost.name,
    ghost2DeckName: ghost2.name,
    ghostMovies: ghost.movies,
    ghost2Movies: ghost2.movies,
    setGhost(nextId: string) {
      setSelection((current) => ghostSelectionAfterPick(deckId, current, 1, nextId))
    },
    setGhost2(nextId: string) {
      setSelection((current) => ghostSelectionAfterPick(deckId, current, 2, nextId))
    },
    swap,
  }
}

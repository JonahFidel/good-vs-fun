import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApiFetch } from '../lib/api'
import { moveUserDeck, sortDecks, type DeckSort } from '../lib/deckOrder'
import { formatTitle } from '../lib/format'
import type { Deck } from '../lib/types'

export function useDecks() {
  const apiFetch = useApiFetch()
  const [decks, setDecks] = useState<Deck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [deckName, setDeckName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deckSort, setDeckSort] = useState<DeckSort>('recent')

  const loadDecks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/decks')
      const nextDecks = (data?.decks ?? []) as Deck[]
      setDecks(nextDecks)
      if (!selectedDeckId && nextDecks.length > 0) {
        setSelectedDeckId(nextDecks[0].id)
      }
    } catch {
      setError('Failed to load decks.')
    } finally {
      setLoading(false)
    }
  }, [selectedDeckId, apiFetch])

  useEffect(() => {
    loadDecks()
  }, [loadDecks])

  const sortedDecks = useMemo(
    () => sortDecks(decks, deckSort),
    [decks, deckSort],
  )

  const ensureManualDeckOrder = useCallback(() => {
    if (deckSort === 'manual') {
      return
    }
    setDecks(sortedDecks)
    setDeckSort('manual')
  }, [deckSort, sortedDecks])

  const moveDeck = useCallback((draggedId: string, targetId: string) => {
    setDecks((current) => moveUserDeck(current, draggedId, targetId))
  }, [])

  const handleCreateDeck = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = deckName.trim()
    if (!trimmedName) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/decks', {
        method: 'POST',
        body: JSON.stringify({ name: formatTitle(trimmedName) }),
      })
      if (data?.deck) {
        setDecks((current) => {
          const examples = current.filter((deck) => deck.isExample)
          const userDecks = current.filter((deck) => !deck.isExample)
          return [...examples, data.deck as Deck, ...userDecks]
        })
        setSelectedDeckId((data.deck as Deck).id)
        setDeckName('')
      }
    } catch {
      setError('Failed to create deck.')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameDeck = async (deck: Deck) => {
    const nextName = window.prompt('Rename deck', deck.name)
    if (!nextName) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const formattedName = formatTitle(nextName)
      const data = await apiFetch(`/api/decks/${deck.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: formattedName }),
      })
      setDecks((current) =>
        current.map((item) =>
          item.id === deck.id
            ? { ...item, name: (data?.deck?.name as string) ?? formattedName }
            : item,
        ),
      )
    } catch {
      setError('Failed to rename deck.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDeck = async (deck: Deck) => {
    const confirmed = window.confirm(
      `Delete "${deck.name}" and its movies? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      await apiFetch(`/api/decks/${deck.id}`, { method: 'DELETE' })
      setDecks((current) => {
        const remaining = current.filter((item) => item.id !== deck.id)
        if (selectedDeckId === deck.id) {
          setSelectedDeckId(remaining[0]?.id ?? null)
        }
        return remaining
      })
    } catch {
      setError('Failed to delete deck.')
    } finally {
      setLoading(false)
    }
  }

  return {
    sortedDecks,
    selectedDeckId,
    deckName,
    setDeckName,
    error,
    loading,
    deckSort,
    setDeckSort,
    ensureManualDeckOrder,
    moveDeck,
    handleCreateDeck,
    handleRenameDeck,
    handleDeleteDeck,
  }
}

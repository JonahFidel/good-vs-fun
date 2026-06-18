import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApiFetch } from '../lib/api'
import { formatTitle } from '../lib/format'
import { alertExampleDeckReadOnly } from '../lib/exampleDeck'
import type { Deck } from '../lib/types'

export function DecksPage() {
  const apiFetch = useApiFetch()
  const [decks, setDecks] = useState<Deck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [deckName, setDeckName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deckSort, setDeckSort] = useState<'manual' | 'recent' | 'name' | 'count'>(
    'recent',
  )
  const [draggingDeckId, setDraggingDeckId] = useState<string | null>(null)
  const [deckDragOverId, setDeckDragOverId] = useState<string | null>(null)

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

  const sortedDecks = useMemo(() => {
    const examples = decks.filter((deck) => deck.isExample)
    const userDecks = [...decks.filter((deck) => !deck.isExample)]

    switch (deckSort) {
      case 'manual':
        break
      case 'name':
        userDecks.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'count':
        userDecks.sort((a, b) => (b.movieCount ?? 0) - (a.movieCount ?? 0))
        break
      case 'recent':
      default:
        userDecks.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        break
    }

    return [...examples, ...userDecks]
  }, [decks, deckSort])

  const ensureManualDeckOrder = useCallback(() => {
    if (deckSort === 'manual') {
      return
    }
    setDecks(sortedDecks)
    setDeckSort('manual')
  }, [deckSort, sortedDecks])

  const moveDeck = useCallback((draggedId: string, targetId: string) => {
    setDecks((current) => {
      const dragged = current.find((deck) => deck.id === draggedId)
      const target = current.find((deck) => deck.id === targetId)
      if (!dragged || !target || dragged.isExample || target.isExample) {
        return current
      }

      const examples = current.filter((deck) => deck.isExample)
      const userDecks = current.filter((deck) => !deck.isExample)
      const fromIndex = userDecks.findIndex((deck) => deck.id === draggedId)
      const toIndex = userDecks.findIndex((deck) => deck.id === targetId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current
      }
      const nextUserDecks = [...userDecks]
      const [moved] = nextUserDecks.splice(fromIndex, 1)
      nextUserDecks.splice(toIndex, 0, moved)
      return [...examples, ...nextUserDecks]
    })
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

  return (
    <div className="panel decks-panel">
      {error && <p className="error-banner">{error}</p>}
      {loading && <p className="status-line">Syncing changes…</p>}

      <div className="deck-controls">
        <div>
          <h2>Decks</h2>
          <p className="subhead">
            Create and manage your decks, or explore the example decks. Open a deck to compare it with another as a read-only ghost overlay.
          </p>
        </div>

        <form className="deck-form" onSubmit={handleCreateDeck}>
          <input
            type="text"
            placeholder="New deck name"
            value={deckName}
            onChange={(event) => setDeckName(event.target.value)}
            required
          />
          <button type="submit">Add deck</button>
        </form>

        <div className="deck-toolbar">
          <label>
            Sort decks
            <select
              value={deckSort}
              onChange={(event) =>
                setDeckSort(
                  event.target.value as 'manual' | 'recent' | 'name' | 'count',
                )
              }
            >
              <option value="manual">Manual</option>
              <option value="recent">Most recent</option>
              <option value="name">Name</option>
              <option value="count">Movie count</option>
            </select>
          </label>
        </div>

        <ul className="deck-list">
          {sortedDecks.map((deck) => (
            <li
              key={deck.id}
              className={[
                deck.id === selectedDeckId ? 'active' : '',
                deckDragOverId === deck.id ? 'drag-over' : '',
                deck.isExample ? 'deck-list-item--example' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable
              onDragStart={(event) => {
                if (deck.isExample) {
                  event.preventDefault()
                  alertExampleDeckReadOnly()
                  return
                }
                ensureManualDeckOrder()
                setDraggingDeckId(deck.id)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', deck.id)
              }}
              onDragEnd={() => {
                setDraggingDeckId(null)
                setDeckDragOverId(null)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                if (draggingDeckId) {
                  setDeckDragOverId(deck.id)
                  event.dataTransfer.dropEffect = 'move'
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (deck.isExample) {
                  return
                }
                const draggedId =
                  draggingDeckId ?? event.dataTransfer.getData('text/plain')
                if (!draggedId || draggedId === deck.id) {
                  return
                }
                moveDeck(draggedId, deck.id)
                setDraggingDeckId(null)
                setDeckDragOverId(null)
              }}
            >
              <Link className="deck-select" to={`/deck/${deck.id}/movies`}>
                <span>
                  {deck.name}
                  {deck.isExample && <span className="deck-example-badge">Example</span>}
                </span>
                <span className="deck-meta">
                  {(deck.movieCount ?? 0).toString()} films
                </span>
              </Link>
              {!deck.isExample && (
                <div className="deck-actions">
                  <button type="button" onClick={() => handleRenameDeck(deck)}>
                    Rename
                  </button>
                  <button
                    type="button"
                    className="deck-action-delete"
                    onClick={() => handleDeleteDeck(deck)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}


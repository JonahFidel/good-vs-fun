import { useState } from 'react'
import { Link } from 'react-router-dom'
import { alertExampleDeckReadOnly } from '../../lib/exampleDeck'
import type { Deck } from '../../lib/types'

export function DeckList({
  decks,
  selectedDeckId,
  onReorderStart,
  onMoveDeck,
  onRename,
  onDelete,
}: {
  decks: Deck[]
  selectedDeckId: string | null
  onReorderStart: () => void
  onMoveDeck: (draggedId: string, targetId: string) => void
  onRename: (deck: Deck) => void
  onDelete: (deck: Deck) => void
}) {
  const [draggingDeckId, setDraggingDeckId] = useState<string | null>(null)
  const [deckDragOverId, setDeckDragOverId] = useState<string | null>(null)

  return (
    <ul className="deck-list">
      {decks.map((deck) => (
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
            onReorderStart()
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
            onMoveDeck(draggedId, deck.id)
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
              <button type="button" onClick={() => onRename(deck)}>
                Rename
              </button>
              <button
                type="button"
                className="deck-action-delete"
                onClick={() => onDelete(deck)}
              >
                Delete
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

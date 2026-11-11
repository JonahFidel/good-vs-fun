import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { useFinePointer } from '../../hooks/deck/useWideLayout'
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
  onRename: (deck: Deck, nextName: string) => void
  onDelete: (deck: Deck) => void
}) {
  const canDragToReorder = useFinePointer()
  const [draggingDeckId, setDraggingDeckId] = useState<string | null>(null)
  const [deckDragOverId, setDeckDragOverId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const committingRef = useRef(false)
  const renameArmedRef = useRef(false)
  const [renamingDeckId, setRenamingDeckId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useLayoutEffect(() => {
    if (!renamingDeckId) {
      renameArmedRef.current = false
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
    const frame = window.requestAnimationFrame(() => {
      renameArmedRef.current = true
    })
    return () => window.cancelAnimationFrame(frame)
  }, [renamingDeckId])

  const beginRename = (deck: Deck) => {
    if (renamingDeckId === deck.id) {
      return
    }
    committingRef.current = false
    // flushSync so the input mounts and useLayoutEffect can focus it
    // inside this tap. iOS will not open the keyboard for a focus()
    // that runs after the gesture.
    flushSync(() => {
      setRenamingDeckId(deck.id)
      setDraft(deck.name)
    })
  }

  const stopRename = () => {
    setRenamingDeckId(null)
    setDraft('')
  }

  const cancelRename = () => {
    committingRef.current = true
    renameArmedRef.current = false
    stopRename()
    queueMicrotask(() => {
      committingRef.current = false
    })
  }

  const commitRename = (deck: Deck, fromBlur = false) => {
    if (committingRef.current) {
      return
    }
    if (fromBlur && !renameArmedRef.current) {
      return
    }
    committingRef.current = true
    renameArmedRef.current = false
    stopRename()
    onRename(deck, draft)
    queueMicrotask(() => {
      committingRef.current = false
    })
  }

  const handleRenameKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    deck: Deck,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename(deck)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelRename()
    }
  }

  return (
    <ul className="deck-list">
      {decks.map((deck) => {
        const isRenaming = renamingDeckId === deck.id
        return (
          <li
            key={deck.id}
            className={[
              deck.id === selectedDeckId ? 'active' : '',
              deckDragOverId === deck.id ? 'drag-over' : '',
              deck.isExample ? 'deck-list-item--example' : '',
              canDragToReorder && !isRenaming ? 'deck-list-item--reorderable' : '',
              isRenaming ? 'deck-list-item--renaming' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={canDragToReorder && !isRenaming}
            onDragStart={(event) => {
              if (!canDragToReorder || isRenaming) {
                event.preventDefault()
                return
              }
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
            {isRenaming ? (
              <input
                ref={inputRef}
                className="deck-rename-input"
                type="text"
                value={draft}
                autoComplete="off"
                enterKeyHint="done"
                aria-label="Deck name"
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => commitRename(deck, true)}
                onKeyDown={(event) => handleRenameKeyDown(event, deck)}
                onPointerDown={(event) => {
                  event.stopPropagation()
                }}
              />
            ) : (
              <>
                <Link className="deck-select" to={`/deck/${deck.id}/movies`}>
                  <span>
                    {deck.name}
                    {deck.isExample && (
                      <span className="deck-example-badge">Example</span>
                    )}
                  </span>
                  <span className="deck-meta">
                    {(deck.movieCount ?? 0).toString()} films
                  </span>
                </Link>
                {!deck.isExample && (
                  <div className="deck-actions">
                    <button type="button" onClick={() => beginRename(deck)}>
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
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

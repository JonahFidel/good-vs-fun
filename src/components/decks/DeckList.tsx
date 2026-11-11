import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as InputKeyboardEvent,
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
  const deleteArmedRef = useRef(false)
  const [renamingDeckId, setRenamingDeckId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  )
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

  useEffect(() => {
    if (!confirmingDeleteId) {
      deleteArmedRef.current = false
      return
    }
    deleteArmedRef.current = false
    const timer = window.setTimeout(() => {
      deleteArmedRef.current = true
    }, 350)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfirmingDeleteId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [confirmingDeleteId])

  const beginRename = (deck: Deck) => {
    if (renamingDeckId === deck.id) {
      return
    }
    setConfirmingDeleteId(null)
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
    event: InputKeyboardEvent<HTMLInputElement>,
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

  const beginConfirmDelete = (deck: Deck) => {
    // Inline confirm replaces window.confirm, a tiny native iOS dialog.
    if (confirmingDeleteId === deck.id) {
      return
    }
    if (renamingDeckId) {
      cancelRename()
    }
    setConfirmingDeleteId(deck.id)
  }

  const cancelDelete = () => {
    setConfirmingDeleteId(null)
  }

  const confirmDelete = (deck: Deck) => {
    // A double-tap on the row Delete would otherwise land on this
    // same-side confirm control and remove the deck immediately.
    if (!deleteArmedRef.current) {
      return
    }
    setConfirmingDeleteId(null)
    onDelete(deck)
  }

  return (
    <ul className="deck-list">
      {decks.map((deck) => {
        const isRenaming = renamingDeckId === deck.id
        const isConfirmingDelete = confirmingDeleteId === deck.id
        const canReorder =
          canDragToReorder && !isRenaming && !isConfirmingDelete
        return (
          <li
            key={deck.id}
            className={[
              deck.id === selectedDeckId ? 'active' : '',
              deckDragOverId === deck.id ? 'drag-over' : '',
              deck.isExample ? 'deck-list-item--example' : '',
              canReorder ? 'deck-list-item--reorderable' : '',
              isRenaming ? 'deck-list-item--renaming' : '',
              isConfirmingDelete ? 'deck-list-item--confirming-delete' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={canReorder}
            onDragStart={(event) => {
              if (!canReorder) {
                event.preventDefault()
                return
              }
              if (deck.isExample) {
                event.preventDefault()
                // In-app notice replaces window.alert, a blocking iOS dialog.
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
            ) : isConfirmingDelete ? (
              <div
                className="deck-delete-confirm"
                role="group"
                aria-label={`Delete ${deck.name}`}
              >
                <p className="deck-delete-confirm-name">{deck.name}</p>
                <p className="deck-delete-confirm-copy">
                  Delete this deck and its movies? This cannot be undone.
                </p>
                <div className="deck-actions">
                  <button type="button" onClick={cancelDelete}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="deck-action-delete"
                    onClick={() => confirmDelete(deck)}
                  >
                    Delete
                  </button>
                </div>
              </div>
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
                      onClick={() => beginConfirmDelete(deck)}
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

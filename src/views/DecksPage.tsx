import { DeckList } from '../components/decks/DeckList'
import { useDecks } from '../hooks/useDecks'
import type { DeckSort } from '../lib/deckOrder'

export function DecksPage() {
  const {
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
  } = useDecks()

  return (
    <div className="panel decks-panel">
      {error && <p className="error-banner">{error}</p>}
      {loading && <p className="status-line">Syncing changes…</p>}

      <div className="deck-controls">
        <div>
          <h2>Decks</h2>
          <p className="subhead">
            Create and manage your decks, or explore the example decks. Open a deck to compare it with up to two others as read-only ghost overlays.
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
                setDeckSort(event.target.value as DeckSort)
              }
            >
              <option value="manual">Manual</option>
              <option value="recent">Most recent</option>
              <option value="name">Name</option>
              <option value="count">Movie count</option>
            </select>
          </label>
        </div>

        <DeckList
          decks={sortedDecks}
          selectedDeckId={selectedDeckId}
          onReorderStart={ensureManualDeckOrder}
          onMoveDeck={moveDeck}
          onRename={handleRenameDeck}
          onDelete={handleDeleteDeck}
        />
      </div>
    </div>
  )
}

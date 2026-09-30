import type { Deck } from '../../lib/types'

type GhostCompareControlsProps = {
  primaryName: string
  primaryIsExample: boolean
  otherDecks: Deck[]
  ghostDeckId: string
  ghost2DeckId: string
  ghostDeckName: string
  ghost2DeckName: string
  onGhostDeckChange: (id: string) => void
  onGhost2DeckChange: (id: string) => void
  onSwap: (slot: 1 | 2) => void
}

export function GhostCompareControls({
  primaryName,
  primaryIsExample,
  otherDecks,
  ghostDeckId,
  ghost2DeckId,
  ghostDeckName,
  ghost2DeckName,
  onGhostDeckChange,
  onGhost2DeckChange,
  onSwap,
}: GhostCompareControlsProps) {
  if (otherDecks.length === 0 && !ghostDeckId && !ghost2DeckId) {
    return null
  }

  return (
    <div className="deck-sidebar-section deck-sidebar-section--tools deck-sidebar-tools">
      {otherDecks.length > 0 && (
        <div className="ghost-compare-section">
          <label className="ghost-compare-label" htmlFor="ghost-deck-select">
            Compare with
          </label>
          <div className="ghost-compare-row">
            <select
              id="ghost-deck-select"
              value={ghostDeckId}
              onChange={(event) => onGhostDeckChange(event.target.value)}
            >
              <option value="">None</option>
              {otherDecks
                .filter((deck) => deck.id !== ghost2DeckId)
                .map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
            </select>
            {ghostDeckId && (
              <button type="button" className="btn-swap" onClick={() => onSwap(1)}>
                ⇄ Swap primary
              </button>
            )}
          </div>
          <label
            className="ghost-compare-label ghost-compare-label--secondary"
            htmlFor="ghost2-deck-select"
          >
            And also
          </label>
          <div className="ghost-compare-row">
            <select
              id="ghost2-deck-select"
              value={ghost2DeckId}
              onChange={(event) => onGhost2DeckChange(event.target.value)}
            >
              <option value="">None</option>
              {otherDecks
                .filter((deck) => deck.id !== ghostDeckId)
                .map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
            </select>
            {ghost2DeckId && (
              <button type="button" className="btn-swap" onClick={() => onSwap(2)}>
                ⇄ Swap primary
              </button>
            )}
          </div>
          <p className="ghost-compare-hint">
            Ghost decks are view-only on the grid — edit the primary deck, then swap if
            needed.
          </p>
        </div>
      )}
      {(ghostDeckId || ghost2DeckId) && (
        <div className="ghost-legend">
          <span className="ghost-legend-item">
            <span className="ghost-swatch ghost-swatch-primary" />
            {primaryName} (primary{primaryIsExample ? ', read-only' : ', editable'})
          </span>
          {ghostDeckId && (
            <span className="ghost-legend-item">
              <span className="ghost-swatch ghost-swatch-ghost" />
              {ghostDeckName || '…'} (ghost, read-only)
            </span>
          )}
          {ghost2DeckId && (
            <span className="ghost-legend-item">
              <span className="ghost-swatch ghost-swatch-ghost2" />
              {ghost2DeckName || '…'} (ghost, read-only)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

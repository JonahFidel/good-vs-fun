// Example decks are read-only. Routes reject edits through isExampleDeckId.
// Genre decks use exaggerated spreads. Jonah's decks are live snapshots from Turso.

import { actionDeck } from './action.js'
import { comedyDeck } from './comedy.js'
import { dramaDeck } from './drama.js'
import { jonah2025Deck } from './jonah-2025.js'
import { jonah2026Deck } from './jonah-2026.js'

export const EXAMPLE_DECKS = [
  actionDeck,
  comedyDeck,
  dramaDeck,
  jonah2025Deck,
  jonah2026Deck,
]

const exampleDeckById = new Map(EXAMPLE_DECKS.map((deck) => [deck.id, deck]))

export const getExampleDeck = (deckId) => exampleDeckById.get(deckId) ?? null

export const isExampleDeckId = (deckId) => exampleDeckById.has(deckId)

import type { Deck } from './types'

export type DeckSort = 'manual' | 'recent' | 'name' | 'count'

/** Examples stay in place. User decks are sorted beneath them. */
export function sortDecks(decks: Deck[], deckSort: DeckSort): Deck[] {
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
}

/**
 * Reorder one user deck among the other user decks.
 * Example decks stay pinned, and a drag onto or from an example is ignored.
 */
export function moveUserDeck(
  current: Deck[],
  draggedId: string,
  targetId: string,
): Deck[] {
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
}

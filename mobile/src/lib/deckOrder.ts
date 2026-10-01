import type { Deck } from '@good-vs-fun/shared'

export type DeckSort = 'recent' | 'name' | 'count'

/** Examples stay pinned. User decks are sorted beneath them, matching the website. */
export function sortDecks(decks: Deck[], deckSort: DeckSort): Deck[] {
  const examples = decks.filter((deck) => deck.isExample)
  const userDecks = [...decks.filter((deck) => !deck.isExample)]

  switch (deckSort) {
    case 'name':
      userDecks.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'count':
      userDecks.sort((a, b) => (b.movieCount ?? 0) - (a.movieCount ?? 0))
      break
    case 'recent':
    default:
      userDecks.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      break
  }

  return [...examples, ...userDecks]
}

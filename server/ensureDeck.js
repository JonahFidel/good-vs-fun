import { db } from './db.js'

export const ensureDeckExists = async (deckId, ownerId) => {
  const result = await db.execute({
    sql: 'SELECT id FROM decks WHERE id = ? AND owner_id = ?',
    args: [deckId, ownerId],
  })
  return result.rows.length > 0
}

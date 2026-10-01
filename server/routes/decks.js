import { randomUUID } from 'node:crypto'
import { ApiRoute } from '@good-vs-fun/shared'
import { Router } from 'express'
import { db } from '../db.js'
import { ensureDeckExists } from '../ensureDeck.js'
import {
  EXAMPLE_DECKS,
  getExampleDeck,
  isExampleDeckId,
} from '../exampleDecks/index.js'
import { formatTitle } from '../formatTitle.js'
import { asyncHandler, requireAuth, respondError } from '../http.js'

const nowIso = () => new Date().toISOString()

export const decksRouter = Router()

decksRouter.get(ApiRoute.decks, requireAuth, asyncHandler(async (req, res) => {
  const ownerId = req.userId
  const result = await db.execute({
    sql: `
      SELECT
        d.id,
        d.name,
        d.created_at,
        d.updated_at,
        COUNT(dm.movie_id) AS movie_count
      FROM decks d
      LEFT JOIN deck_movies dm ON dm.deck_id = d.id
      WHERE d.owner_id = ?
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `,
    args: [ownerId],
  })

  const userDecks = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    movieCount: Number(row.movie_count ?? 0),
    isExample: false,
  }))

  const exampleDecks = EXAMPLE_DECKS.map((deck) => ({
    id: deck.id,
    name: deck.name,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
    movieCount: deck.movies.length,
    isExample: true,
  }))

  res.json({ decks: [...exampleDecks, ...userDecks] })
}))

decksRouter.post(ApiRoute.decks, requireAuth, asyncHandler(async (req, res) => {
  const ownerId = req.userId
  const name = formatTitle(
    typeof req.body?.name === 'string' ? req.body.name.trim() : '',
  )
  if (!name) {
    return respondError(res, 400, 'Deck name is required.')
  }

  const id = randomUUID()
  const timestamp = nowIso()

  await db.execute({
    sql: 'INSERT INTO decks (id, owner_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, ownerId, name, timestamp, timestamp],
  })

  res.status(201).json({
    deck: { id, name, createdAt: timestamp, updatedAt: timestamp, movieCount: 0 },
  })
}))

decksRouter.get(ApiRoute.deck, requireAuth, asyncHandler(async (req, res) => {
  const { deckId } = req.params
  const exampleDeck = getExampleDeck(deckId)
  if (exampleDeck) {
    return res.json({
      deck: {
        id: exampleDeck.id,
        name: exampleDeck.name,
        createdAt: exampleDeck.createdAt,
        updatedAt: exampleDeck.updatedAt,
        isExample: true,
      },
      movies: exampleDeck.movies,
    })
  }

  const ownerId = req.userId
  const deckResult = await db.execute({
    sql: 'SELECT id, name, created_at, updated_at FROM decks WHERE id = ? AND owner_id = ?',
    args: [deckId, ownerId],
  })

  const deckRow = deckResult.rows[0]
  if (!deckRow) {
    return respondError(res, 404, 'Deck not found.')
  }

  const movieResult = await db.execute({
    sql: `
      SELECT
        m.id,
        m.title,
        dm.fun,
        dm.good,
        dm.created_at
      FROM deck_movies dm
      JOIN movies m ON m.id = dm.movie_id
      WHERE dm.deck_id = ?
      ORDER BY m.title COLLATE NOCASE
    `,
    args: [deckId],
  })

  res.json({
    deck: {
      id: deckRow.id,
      name: deckRow.name,
      createdAt: deckRow.created_at,
      updatedAt: deckRow.updated_at,
    },
    movies: movieResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      fun: Number(row.fun),
      good: Number(row.good),
      createdAt: row.created_at,
    })),
  })
}))

decksRouter.put(ApiRoute.deck, requireAuth, asyncHandler(async (req, res) => {
  const { deckId } = req.params
  if (isExampleDeckId(deckId)) {
    return respondError(res, 403, 'Example decks cannot be edited.')
  }
  const ownerId = req.userId
  const name = formatTitle(
    typeof req.body?.name === 'string' ? req.body.name.trim() : '',
  )

  if (!name) {
    return respondError(res, 400, 'Deck name is required.')
  }

  if (!(await ensureDeckExists(deckId, ownerId))) {
    return respondError(res, 404, 'Deck not found.')
  }

  const timestamp = nowIso()
  await db.execute({
    sql: 'UPDATE decks SET name = ?, updated_at = ? WHERE id = ?',
    args: [name, timestamp, deckId],
  })

  res.json({ deck: { id: deckId, name, updatedAt: timestamp } })
}))

decksRouter.delete(ApiRoute.deck, requireAuth, asyncHandler(async (req, res) => {
  const { deckId } = req.params
  if (isExampleDeckId(deckId)) {
    return respondError(res, 403, 'Example decks cannot be deleted.')
  }
  const ownerId = req.userId
  if (!(await ensureDeckExists(deckId, ownerId))) {
    return respondError(res, 404, 'Deck not found.')
  }

  await db.execute({
    sql: 'DELETE FROM deck_movies WHERE deck_id = ?',
    args: [deckId],
  })
  await db.execute({
    sql: 'DELETE FROM decks WHERE id = ?',
    args: [deckId],
  })
  await db.execute({
    sql: 'DELETE FROM movies WHERE id NOT IN (SELECT movie_id FROM deck_movies)',
  })

  res.status(204).send()
}))

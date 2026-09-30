import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { db } from '../db.js'
import { ensureDeckExists } from '../ensureDeck.js'
import { isExampleDeckId } from '../exampleDecks/index.js'
import { asyncHandler, requireAuth, respondError } from '../http.js'

const nowIso = () => new Date().toISOString()

export const moviesRouter = Router()

moviesRouter.post('/api/decks/:deckId/movies', requireAuth, asyncHandler(async (req, res) => {
  const { deckId } = req.params
  if (isExampleDeckId(deckId)) {
    return respondError(res, 403, 'Example decks cannot be edited.')
  }
  const ownerId = req.userId
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const fun = Number(req.body?.fun)
  const good = Number(req.body?.good)

  if (!title) {
    return respondError(res, 400, 'Movie title is required.')
  }
  if (Number.isNaN(fun) || Number.isNaN(good)) {
    return respondError(res, 400, 'Movie fun/good scores are required.')
  }
  if (!(await ensureDeckExists(deckId, ownerId))) {
    return respondError(res, 404, 'Deck not found.')
  }

  const movieId = randomUUID()
  const timestamp = nowIso()

  await db.execute({
    sql: 'INSERT INTO movies (id, title, created_at) VALUES (?, ?, ?)',
    args: [movieId, title, timestamp],
  })
  await db.execute({
    sql: `
      INSERT INTO deck_movies (deck_id, movie_id, fun, good, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [deckId, movieId, fun, good, timestamp],
  })

  res.status(201).json({
    movie: { id: movieId, title, fun, good, createdAt: timestamp },
  })
}))

moviesRouter.put('/api/decks/:deckId/movies/:movieId', requireAuth, asyncHandler(async (req, res) => {
  const { deckId, movieId } = req.params
  if (isExampleDeckId(deckId)) {
    return respondError(res, 403, 'Example decks cannot be edited.')
  }
  const ownerId = req.userId
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : null
  const fun = Number(req.body?.fun)
  const good = Number(req.body?.good)

  if (Number.isNaN(fun) || Number.isNaN(good)) {
    return respondError(res, 400, 'Movie fun/good scores are required.')
  }
  if (!(await ensureDeckExists(deckId, ownerId))) {
    return respondError(res, 404, 'Deck not found.')
  }

  if (title) {
    await db.execute({
      sql: 'UPDATE movies SET title = ? WHERE id = ?',
      args: [title, movieId],
    })
  }

  await db.execute({
    sql: 'UPDATE deck_movies SET fun = ?, good = ? WHERE deck_id = ? AND movie_id = ?',
    args: [fun, good, deckId, movieId],
  })

  res.json({ movie: { id: movieId, title, fun, good } })
}))

moviesRouter.delete('/api/decks/:deckId/movies/:movieId', requireAuth, asyncHandler(async (req, res) => {
  const { deckId, movieId } = req.params
  if (isExampleDeckId(deckId)) {
    return respondError(res, 403, 'Example decks cannot be edited.')
  }
  const ownerId = req.userId
  if (!(await ensureDeckExists(deckId, ownerId))) {
    return respondError(res, 404, 'Deck not found.')
  }
  await db.execute({
    sql: 'DELETE FROM deck_movies WHERE deck_id = ? AND movie_id = ?',
    args: [deckId, movieId],
  })
  await db.execute({
    sql: 'DELETE FROM movies WHERE id NOT IN (SELECT movie_id FROM deck_movies)',
  })

  res.status(204).send()
}))

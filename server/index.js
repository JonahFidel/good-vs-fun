import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { db } from './db.js'

const app = express()
const port = process.env.PORT || 3001
const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.use(cors())
app.use(express.json())

const nowIso = () => new Date().toISOString()

const respondError = (res, status, message) => {
  res.status(status).json({ error: message })
}

const initSchema = async () => {
  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = await fs.readFile(schemaPath, 'utf-8')
  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await db.execute(statement)
  }
}

const ensureDeckExists = async (deckId) => {
  const result = await db.execute({
    sql: 'SELECT id FROM decks WHERE id = ?',
    args: [deckId],
  })
  return result.rows.length > 0
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/admin/init', async (_req, res) => {
  if (process.env.ENABLE_DB_INIT !== 'true') {
    return respondError(res, 403, 'Database init is disabled.')
  }

  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = await fs.readFile(schemaPath, 'utf-8')

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await db.execute(statement)
  }
  return res.json({ status: 'initialized' })
})

app.get('/api/decks', async (_req, res) => {
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
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `,
  })

  res.json({
    decks: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      movieCount: Number(row.movie_count ?? 0),
    })),
  })
})

app.post('/api/decks', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    return respondError(res, 400, 'Deck name is required.')
  }

  const id = randomUUID()
  const timestamp = nowIso()

  await db.execute({
    sql: 'INSERT INTO decks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    args: [id, name, timestamp, timestamp],
  })

  res.status(201).json({
    deck: { id, name, createdAt: timestamp, updatedAt: timestamp, movieCount: 0 },
  })
})

app.get('/api/decks/:deckId', async (req, res) => {
  const { deckId } = req.params
  const deckResult = await db.execute({
    sql: 'SELECT id, name, created_at, updated_at FROM decks WHERE id = ?',
    args: [deckId],
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
})

app.put('/api/decks/:deckId', async (req, res) => {
  const { deckId } = req.params
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''

  if (!name) {
    return respondError(res, 400, 'Deck name is required.')
  }

  if (!(await ensureDeckExists(deckId))) {
    return respondError(res, 404, 'Deck not found.')
  }

  const timestamp = nowIso()
  await db.execute({
    sql: 'UPDATE decks SET name = ?, updated_at = ? WHERE id = ?',
    args: [name, timestamp, deckId],
  })

  res.json({ deck: { id: deckId, name, updatedAt: timestamp } })
})

app.delete('/api/decks/:deckId', async (req, res) => {
  const { deckId } = req.params
  if (!(await ensureDeckExists(deckId))) {
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
})

app.post('/api/decks/:deckId/movies', async (req, res) => {
  const { deckId } = req.params
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const fun = Number(req.body?.fun)
  const good = Number(req.body?.good)

  if (!title) {
    return respondError(res, 400, 'Movie title is required.')
  }
  if (Number.isNaN(fun) || Number.isNaN(good)) {
    return respondError(res, 400, 'Movie fun/good scores are required.')
  }
  if (!(await ensureDeckExists(deckId))) {
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
})

app.put('/api/decks/:deckId/movies/:movieId', async (req, res) => {
  const { deckId, movieId } = req.params
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : null
  const fun = Number(req.body?.fun)
  const good = Number(req.body?.good)

  if (Number.isNaN(fun) || Number.isNaN(good)) {
    return respondError(res, 400, 'Movie fun/good scores are required.')
  }
  if (!(await ensureDeckExists(deckId))) {
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
})

app.delete('/api/decks/:deckId/movies/:movieId', async (req, res) => {
  const { deckId, movieId } = req.params
  await db.execute({
    sql: 'DELETE FROM deck_movies WHERE deck_id = ? AND movie_id = ?',
    args: [deckId, movieId],
  })
  await db.execute({
    sql: 'DELETE FROM movies WHERE id NOT IN (SELECT movie_id FROM deck_movies)',
  })

  res.status(204).send()
})

initSchema()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API server listening on ${port}`)
    })
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize schema', error)
    process.exitCode = 1
  })

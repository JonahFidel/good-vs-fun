import 'dotenv/config'
import { ApiRoute } from '@good-vs-fun/shared'
import cors from 'cors'
import express from 'express'
import { clerkMiddleware } from '@clerk/express'
import { dbInfo } from './db.js'
import { asyncHandler, respondError } from './http.js'
import { decksRouter } from './routes/decks.js'
import { moviesRouter } from './routes/movies.js'
import { applySchema, ensureSchema } from './schema.js'

export { ensureSchema }

export const app = express()

app.use(cors())
app.use(express.json())
app.use(clerkMiddleware())

app.get(ApiRoute.health, (_req, res) => {
  res.json({ status: 'ok', db: dbInfo() })
})

app.post(ApiRoute.adminInit, asyncHandler(async (_req, res) => {
  if (process.env.ENABLE_DB_INIT !== 'true') {
    return respondError(res, 403, 'Database init is disabled.')
  }

  await applySchema()
  return res.json({ status: 'initialized' })
}))

app.use(decksRouter)
app.use(moviesRouter)

app.use((error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(error)
  respondError(res, 500, 'Internal server error.')
})

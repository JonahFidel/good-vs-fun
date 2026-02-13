import { app, ensureSchema } from '../server/app.js'
import { parse } from 'node:url'

export default async function handler(req, res) {
  // Restore original path when Vercel rewrites /api/* to /api?__path=...
  const parsed = req.url && parse(req.url, true)
  if (parsed) {
    const { __path, ...query } = parsed.query || {}
    if (typeof __path === 'string' && __path) {
      const qs = Object.keys(query).length
        ? '?' + new URLSearchParams(query).toString()
        : ''
      req.url = '/api/' + __path + qs
    }
  }
  await ensureSchema()
  return app(req, res)
}


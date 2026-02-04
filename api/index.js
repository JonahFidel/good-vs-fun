import { app, ensureSchema } from '../server/app.js'

export default async function handler(req, res) {
  await ensureSchema()
  return app(req, res)
}


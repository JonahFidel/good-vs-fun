import { createClient } from '@libsql/client'

const databaseUrl = process.env.TURSO_DATABASE_URL || 'file:./local.db'
const authToken = process.env.TURSO_AUTH_TOKEN

export const db = createClient({
  url: databaseUrl,
  authToken,
})

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatTitle } from '@good-vs-fun/shared'
import { db } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const readSchemaStatements = async () => {
  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = await fs.readFile(schemaPath, 'utf-8')
  return schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
}

export const applySchema = async () => {
  const statements = await readSchemaStatements()
  for (const statement of statements) {
    await db.execute(statement)
  }
}

const ensureOwnerIdColumn = async () => {
  const tableInfo = await db.execute({
    sql: 'PRAGMA table_info(decks)',
  })
  const hasOwnerId = tableInfo.rows.some(
    (row) => String(row.name || '').toLowerCase() === 'owner_id',
  )
  if (!hasOwnerId) {
    await db.execute({
      sql: `ALTER TABLE decks ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'legacy'`,
    })
  }
}

const normalizeDeckNames = async () => {
  const result = await db.execute({
    sql: 'SELECT id, name FROM decks WHERE owner_id != ?',
    args: ['legacy'],
  })

  for (const row of result.rows) {
    const currentName = typeof row.name === 'string' ? row.name : ''
    const nextName = formatTitle(currentName)
    if (!nextName || nextName === currentName) {
      continue
    }

    await db.execute({
      sql: 'UPDATE decks SET name = ? WHERE id = ?',
      args: [nextName, row.id],
    })
  }
}

const initSchema = async () => {
  await applySchema()
  await ensureOwnerIdColumn()
}

let schemaReadyPromise = null

export const ensureSchema = async () => {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await initSchema()
      try {
        await normalizeDeckNames()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to normalize deck names', error)
      }
    })()
  }
  return schemaReadyPromise
}

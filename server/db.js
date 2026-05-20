import { createClient } from '@libsql/client'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const remoteUrl = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
const isVercel = Boolean(process.env.VERCEL)

const localDbPath = path.join(__dirname, 'local.db')
const localUrl = `file:${localDbPath}`

// Vercel's serverless filesystem is read-only except /tmp — never open local.db here.
const localClient = !isVercel ? createClient({ url: localUrl }) : null

if (isVercel && !remoteUrl) {
  throw new Error('TURSO_DATABASE_URL is required in production (Vercel).')
}
const remoteClient = remoteUrl
  ? createClient({
      url: remoteUrl,
      authToken,
    })
  : null

if (!remoteClient && !localClient) {
  throw new Error(
    'No database configured: set TURSO_DATABASE_URL or run outside Vercel for local SQLite.',
  )
}

let activeClient = remoteClient ?? localClient
let hasFallenBack = Boolean(localClient) && activeClient === localClient

const getMode = () => (activeClient === localClient ? 'local' : 'remote')

export const db = {
  execute: async (input) => {
    try {
      return await activeClient.execute(input)
    } catch (error) {
      if (
        localClient &&
        !isVercel &&
        !hasFallenBack &&
        remoteClient &&
        activeClient === remoteClient
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          'Remote DB request failed; falling back to local SQLite.',
          error,
        )
        hasFallenBack = true
        activeClient = localClient
        return await activeClient.execute(input)
      }
      throw error
    }
  },
}

export const dbInfo = () => ({
  mode: getMode(),
  localPath: localDbPath,
  hasRemoteConfigured: Boolean(remoteUrl),
})

import { createClient } from '@libsql/client'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const remoteUrl = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

const localDbPath = path.join(__dirname, 'local.db')
const localUrl = `file:${localDbPath}`

const localClient = createClient({ url: localUrl })
const remoteClient = remoteUrl
  ? createClient({
      url: remoteUrl,
      authToken,
    })
  : null

let activeClient = remoteClient ?? localClient
let hasFallenBack = activeClient === localClient

const getMode = () => (activeClient === localClient ? 'local' : 'remote')

export const db = {
  execute: async (input) => {
    try {
      return await activeClient.execute(input)
    } catch (error) {
      if (!hasFallenBack && remoteClient && activeClient === remoteClient) {
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

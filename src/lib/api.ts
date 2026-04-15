import { useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

const apiBaseRaw = import.meta.env.VITE_API_BASE_URL || ''
const apiBase = apiBaseRaw.endsWith('/')
  ? apiBaseRaw.slice(0, Math.max(0, apiBaseRaw.length - 1))
  : apiBaseRaw

async function fetchJson(
  path: string,
  options: RequestInit & { token?: string | null } = {},
) {
  const { token, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

/**
 * Hook that returns an apiFetch function with the current user's auth token.
 * Use this for all authenticated API calls.
 */
export function useApiFetch() {
  const { getToken } = useAuth()
  return useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getToken()
      return fetchJson(path, { ...options, token })
    },
    [getToken],
  )
}


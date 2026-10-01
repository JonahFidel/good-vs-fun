import { useCallback, useRef } from 'react'
import { useAuth } from '@clerk/expo'
import { apiBaseUrl } from './config'

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

  const response = await fetch(`${apiBaseUrl()}${path}`, {
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

export function useApiFetch() {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  return useCallback(async (path: string, options: RequestInit = {}) => {
    const token = await getTokenRef.current()
    return fetchJson(path, { ...options, token })
  }, [])
}

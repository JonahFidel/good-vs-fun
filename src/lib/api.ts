const apiBaseRaw = import.meta.env.VITE_API_BASE_URL || ''
const apiBase = apiBaseRaw.endsWith('/')
  ? apiBaseRaw.slice(0, Math.max(0, apiBaseRaw.length - 1))
  : apiBaseRaw

export async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
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


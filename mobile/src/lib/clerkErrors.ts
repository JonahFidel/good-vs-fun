function messageFor(errors: unknown, field: string) {
  if (!errors || typeof errors !== 'object' || !('fields' in errors)) {
    return null
  }

  const fields = errors.fields
  if (!fields || typeof fields !== 'object') {
    return null
  }

  const entry = (fields as Record<string, unknown>)[field]
  if (!entry || typeof entry !== 'object' || !('message' in entry)) {
    return null
  }

  return typeof entry.message === 'string' ? entry.message : null
}

export function clerkErrorMessage(errors: unknown, fields: string[], fallback: string) {
  for (const field of fields) {
    const message = messageFor(errors, field)
    if (message) {
      return message
    }
  }
  return fallback
}

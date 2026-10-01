type ClerkErrorFields = {
  longMessage?: string
  message?: string
  errors?: ClerkErrorFields[]
}

export function clerkErrorMessage(
  error: ClerkErrorFields | null | undefined,
  fallback: string,
) {
  return error?.longMessage || error?.message || fallback
}

export function clerkThrownMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const record = error as ClerkErrorFields
    const first = record.errors?.[0]
    if (first) {
      return clerkErrorMessage(first, fallback)
    }
    if (record.longMessage || record.message) {
      return clerkErrorMessage(record, fallback)
    }
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

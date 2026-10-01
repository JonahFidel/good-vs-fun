import { formatTitle } from '@good-vs-fun/shared'

export { formatTitle }

/** Title to persist, or null when the rename should be ignored. */
export function formattedMovieTitle(
  currentTitle: string,
  rawInput: string | undefined,
): string | null {
  const trimmed = rawInput?.trim() ?? ''
  if (!trimmed) {
    return null
  }

  const formatted = formatTitle(trimmed)
  if (!formatted || formatted === currentTitle) {
    return null
  }

  return formatted
}

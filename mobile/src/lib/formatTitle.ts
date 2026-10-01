const smallWords = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'from',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
])

/** Title case used by the website when saving deck and movie names. */
export const formatTitle = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index, words) => {
      if (!word) {
        return ''
      }

      const isFirst = index === 0
      const isLast = index === words.length - 1
      if (!isFirst && !isLast && smallWords.has(word)) {
        return word
      }

      return word[0].toUpperCase() + word.slice(1)
    })
    .join(' ')

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

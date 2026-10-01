export {
  SCORE_STEP as POSITION_STEP,
  formatScore,
  snapScoreToStep,
} from '@good-vs-fun/shared'

export const formatTitle = (value: string) => {
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

  return value
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
}

export const clampPercent = (value: number) => Math.min(100, Math.max(0, value))


const clampScore = (value: number) => Math.min(10, Math.max(0, value))

export const POSITION_STEP = 0.01

export const snapScoreToStep = (value: number, step = POSITION_STEP) => {
  const safeStep = step <= 0 ? POSITION_STEP : step
  const snapped = Math.round(value / safeStep) * safeStep
  const decimals = safeStep >= 1 ? 0 : safeStep >= 0.1 ? 1 : 2
  return clampScore(Number(snapped.toFixed(decimals)))
}

export const formatScore = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString()
  }
  if (Number.isInteger(value * 10)) {
    return value.toFixed(1)
  }
  return value.toFixed(2)
}

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


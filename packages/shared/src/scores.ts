export const SCORE_MIN = 0
export const SCORE_MAX = 10
export const SCORE_STEP = 0.01

export const clampScore = (value: number) =>
  Math.min(SCORE_MAX, Math.max(SCORE_MIN, value))

export const snapScoreToStep = (value: number, step = SCORE_STEP) => {
  const safeStep = step <= 0 ? SCORE_STEP : step
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

export {
  SCORE_STEP as POSITION_STEP,
  formatScore,
  formatTitle,
  snapScoreToStep,
} from '@good-vs-fun/shared'

export const clampPercent = (value: number) => Math.min(100, Math.max(0, value))


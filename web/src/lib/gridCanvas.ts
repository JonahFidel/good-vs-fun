import { SCORE_MAX } from '@good-vs-fun/shared'

/** Margin (in score units) around the 0–10 scoring region inside the plot canvas. */
export const GRID_MARGIN = 1

export const GRID_SCORE_MAX = SCORE_MAX

export const GRID_CANVAS = GRID_MARGIN * 2 + GRID_SCORE_MAX

export function scoreToPlotPercent(score: number, axis: 'x' | 'y'): number {
  const clamped = Math.min(GRID_SCORE_MAX, Math.max(0, score))
  const along = (clamped + GRID_MARGIN) / GRID_CANVAS
  return axis === 'y' ? (1 - along) * 100 : along * 100
}

export function pointerRatioToScore(ratio: number): number {
  return ratio * GRID_CANVAS - GRID_MARGIN
}

/**
 * Screen-space box of the 0-10 scoring region inside a zoomed canvas.
 * Used to pin grid lines to the slot so they stay 1px while the canvas scales.
 */
export function scoringRegionScreenRect(
  scale: number,
  tx: number,
  ty: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  return {
    left: tx + (GRID_MARGIN / GRID_CANVAS) * canvasWidth * scale,
    top: ty + (GRID_MARGIN / GRID_CANVAS) * canvasHeight * scale,
    width: (GRID_SCORE_MAX / GRID_CANVAS) * canvasWidth * scale,
    height: (GRID_SCORE_MAX / GRID_CANVAS) * canvasHeight * scale,
  }
}

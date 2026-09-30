/** Margin (in score units) around the 0–10 scoring region inside the plot canvas. */
export const GRID_MARGIN = 1;
export const GRID_SCORE_MAX = 10;
export const GRID_CANVAS = GRID_MARGIN * 2 + GRID_SCORE_MAX;
export function scoreToPlotPercent(score, axis) {
    const clamped = Math.min(GRID_SCORE_MAX, Math.max(0, score));
    const along = (clamped + GRID_MARGIN) / GRID_CANVAS;
    return axis === 'y' ? (1 - along) * 100 : along * 100;
}
export function pointerRatioToScore(ratio) {
    return ratio * GRID_CANVAS - GRID_MARGIN;
}

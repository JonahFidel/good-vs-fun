import { SCORE_MAX, SCORE_MIN, snapScoreToStep, type Movie } from '@good-vs-fun/shared'

/** Score units of padding around the 0–10 region. The website canvas stays in web/. */
export const PLOT_MARGIN = 1

export const PLOT_SPAN = PLOT_MARGIN * 2 + SCORE_MAX

export type PositionGroupItem = {
  id: string
  title: string
}

export type PositionGroup = {
  key: string
  fun: number
  good: number
  items: PositionGroupItem[]
}

export function scoreToPlotPercent(score: number, axis: 'x' | 'y'): number {
  const clamped = Math.min(SCORE_MAX, Math.max(SCORE_MIN, score))
  const along = (clamped + PLOT_MARGIN) / PLOT_SPAN
  return axis === 'y' ? (1 - along) * 100 : along * 100
}

/**
 * Inverse of scoreToPlotPercent for a touch inside the plot square.
 * X grows Good. Y grows downward, so Fun is measured from the top.
 */
export function scoresAtPlotPoint(
  x: number,
  y: number,
  width: number,
  height: number,
): { fun: number; good: number } {
  const safeWidth = width > 0 ? width : 1
  const safeHeight = height > 0 ? height : 1
  const clampedX = Math.min(Math.max(x, 0), safeWidth)
  const clampedY = Math.min(Math.max(y, 0), safeHeight)
  return {
    good: snapScoreToStep((clampedX / safeWidth) * PLOT_SPAN - PLOT_MARGIN),
    fun: snapScoreToStep((1 - clampedY / safeHeight) * PLOT_SPAN - PLOT_MARGIN),
  }
}

/** Keep the movies under a finger in their own dot until the drag ends. */
export function splitPlotMovies(
  movies: Movie[],
  dragIds: readonly string[] | null,
): { resting: Movie[]; dragged: Movie[] } {
  if (!dragIds || dragIds.length === 0) {
    return { resting: movies, dragged: [] }
  }

  const dragging = new Set(dragIds)
  const resting: Movie[] = []
  const dragged: Movie[] = []
  for (const movie of movies) {
    if (dragging.has(movie.id)) {
      dragged.push(movie)
    } else {
      resting.push(movie)
    }
  }
  return { resting, dragged }
}

export function groupByPosition(movies: Movie[]): PositionGroup[] {
  const groups = new Map<string, PositionGroup>()

  movies.forEach((movie) => {
    const fun = snapScoreToStep(movie.fun)
    const good = snapScoreToStep(movie.good)
    const key = `${fun.toFixed(2)}-${good.toFixed(2)}`
    const item = { id: movie.id, title: movie.title }
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.set(key, { key, fun, good, items: [item] })
    }
  })

  return Array.from(groups.values()).map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => a.title.localeCompare(b.title)),
  }))
}

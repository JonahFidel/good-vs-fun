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

import { snapScoreToStep } from './format'
import type { Movie } from './types'

export type PositionGroup = {
  key: string
  fun: number
  good: number
  titles: string[]
}

export function groupByPosition(movies: Movie[]): PositionGroup[] {
  const groups = new Map<string, PositionGroup>()
  movies.forEach((movie) => {
    const fun = snapScoreToStep(movie.fun)
    const good = snapScoreToStep(movie.good)
    const key = `${fun.toFixed(2)}-${good.toFixed(2)}`
    const existing = groups.get(key)
    if (existing) {
      existing.titles.push(movie.title)
    } else {
      groups.set(key, { key, fun, good, titles: [movie.title] })
    }
  })
  return Array.from(groups.values()).map((group) => ({
    ...group,
    titles: group.titles.sort((a, b) => a.localeCompare(b)),
  }))
}

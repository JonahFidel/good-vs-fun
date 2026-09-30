import { snapScoreToStep } from './format'
import type { Movie } from './types'

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

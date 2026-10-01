import { snapScoreToStep, type Movie } from '@good-vs-fun/shared'

export type MoviePosition = {
  id: string
  fun: number
  good: number
}

export type ScoreMove = {
  before: MoviePosition[]
  after: MoviePosition[]
}

/** Scores for the movies a drag or slider is about to change. */
export function snapshotPositions(movies: Movie[], ids: readonly string[]): MoviePosition[] {
  const idSet = new Set(ids)
  return movies
    .filter((movie) => idSet.has(movie.id))
    .map((movie) => ({ id: movie.id, fun: movie.fun, good: movie.good }))
}

export function positionsDiffer(before: MoviePosition[], movies: Movie[]) {
  return before.some((entry) => {
    const movie = movies.find((item) => item.id === entry.id)
    if (!movie) {
      return false
    }
    return (
      snapScoreToStep(movie.fun) !== snapScoreToStep(entry.fun) ||
      snapScoreToStep(movie.good) !== snapScoreToStep(entry.good)
    )
  })
}

export function positionsAfter(before: MoviePosition[], movies: Movie[]): MoviePosition[] {
  return before.map((entry) => {
    const movie = movies.find((item) => item.id === entry.id)
    return movie ? { id: movie.id, fun: movie.fun, good: movie.good } : entry
  })
}

/** One undo step when the snapshot scores actually changed. Otherwise null. */
export function scoreMoveFromSnapshot(
  before: MoviePosition[] | null,
  movies: Movie[],
): ScoreMove | null {
  if (!before || before.length === 0 || !positionsDiffer(before, movies)) {
    return null
  }
  return { before, after: positionsAfter(before, movies) }
}

export function applyPositions(movies: Movie[], positions: MoviePosition[]): Movie[] {
  return movies.map((movie) => {
    const update = positions.find((item) => item.id === movie.id)
    return update ? { ...movie, fun: update.fun, good: update.good } : movie
  })
}

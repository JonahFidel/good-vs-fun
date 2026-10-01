import assert from 'node:assert/strict'
import test from 'node:test'
import type { Movie } from '@good-vs-fun/shared'
import { scoresAtPlotPoint, scoreToPlotPercent, splitPlotMovies } from './plot.ts'

const SIZE = 1200

function point(score: number, axis: 'x' | 'y') {
  return (scoreToPlotPercent(score, axis) / 100) * SIZE
}

test('scoresAtPlotPoint maps plot touches back to Good and Fun', () => {
  const mid = scoresAtPlotPoint(point(5, 'x'), point(5, 'y'), SIZE, SIZE)
  assert.equal(mid.good, 5)
  assert.equal(mid.fun, 5)

  const origin = scoresAtPlotPoint(point(0, 'x'), point(0, 'y'), SIZE, SIZE)
  assert.equal(origin.good, 0)
  assert.equal(origin.fun, 0)

  const corner = scoresAtPlotPoint(point(10, 'x'), point(10, 'y'), SIZE, SIZE)
  assert.equal(corner.good, 10)
  assert.equal(corner.fun, 10)

  const offset = scoresAtPlotPoint(point(3.25, 'x'), point(7.5, 'y'), SIZE, SIZE)
  assert.equal(offset.good, 3.25)
  assert.equal(offset.fun, 7.5)
})

test('splitPlotMovies keeps a dragged movie out of a dot that shares its score', () => {
  const movies: Movie[] = [
    { id: 'a', title: 'Alien', fun: 8, good: 8 },
    { id: 'b', title: 'Babe', fun: 8, good: 8 },
  ]
  const split = splitPlotMovies(movies, ['a'])
  assert.deepEqual(
    split.dragged.map((movie) => movie.id),
    ['a'],
  )
  assert.deepEqual(
    split.resting.map((movie) => movie.id),
    ['b'],
  )
  assert.deepEqual(splitPlotMovies(movies, null).dragged, [])
})

test('scoresAtPlotPoint clamps touches outside the plot', () => {
  const aboveLeft = scoresAtPlotPoint(-50, -50, 300, 300)
  assert.equal(aboveLeft.good, 0)
  assert.equal(aboveLeft.fun, 10)

  const belowRight = scoresAtPlotPoint(10_000, 10_000, 300, 300)
  assert.equal(belowRight.good, 10)
  assert.equal(belowRight.fun, 0)
})

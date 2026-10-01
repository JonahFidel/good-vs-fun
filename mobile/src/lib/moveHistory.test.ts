import assert from 'node:assert/strict'
import test from 'node:test'
import type { Movie } from '@good-vs-fun/shared'
import {
  applyPositions,
  positionsDiffer,
  scoreMoveFromSnapshot,
  snapshotPositions,
} from './moveHistory.ts'

const movies: Movie[] = [
  { id: 'a', title: 'Alien', fun: 8, good: 4 },
  { id: 'b', title: 'Babe', fun: 2, good: 9 },
]

test('snapshotPositions keeps only the movies in the gesture', () => {
  assert.deepEqual(snapshotPositions(movies, ['b']), [{ id: 'b', fun: 2, good: 9 }])
  assert.deepEqual(snapshotPositions(movies, []), [])
})

test('scoreMoveFromSnapshot ignores a gesture that lands on the same scores', () => {
  const before = snapshotPositions(movies, ['a'])
  assert.equal(scoreMoveFromSnapshot(before, movies), null)
  assert.equal(scoreMoveFromSnapshot(null, movies), null)
  assert.equal(scoreMoveFromSnapshot([], movies), null)
  assert.equal(positionsDiffer([{ id: 'missing', fun: 1, good: 1 }], movies), false)
})

test('scoreMoveFromSnapshot records before and after when Good or Fun changes', () => {
  const before = snapshotPositions(movies, ['a', 'b'])
  const moved = applyPositions(movies, [
    { id: 'a', fun: 3, good: 7 },
    { id: 'b', fun: 3, good: 7 },
  ])
  assert.deepEqual(scoreMoveFromSnapshot(before, moved), {
    before: [
      { id: 'a', fun: 8, good: 4 },
      { id: 'b', fun: 2, good: 9 },
    ],
    after: [
      { id: 'a', fun: 3, good: 7 },
      { id: 'b', fun: 3, good: 7 },
    ],
  })
})

test('applyPositions restores a snapshot without touching other movies', () => {
  const moved = applyPositions(movies, [{ id: 'a', fun: 1, good: 1 }])
  const restored = applyPositions(moved, [{ id: 'a', fun: 8, good: 4 }])
  assert.deepEqual(restored, movies)
})

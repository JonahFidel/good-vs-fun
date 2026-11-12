// @ts-expect-error Node built-ins are available when this file runs under node:test.
import assert from 'node:assert/strict'
// @ts-expect-error Node built-ins are available when this file runs under node:test.
import test from 'node:test'
import {
  crossedMovieDragThreshold,
  MOVIE_DRAG_MOVE_PX,
} from './plotDragGesture.ts'

test('a mouse movement starts dragging a movie without a hold delay', () => {
  assert.equal(MOVIE_DRAG_MOVE_PX, 12)
  assert.equal(crossedMovieDragThreshold(100, 100, 112, 100), true)
  assert.equal(crossedMovieDragThreshold(100, 100, 111, 100), false)
})

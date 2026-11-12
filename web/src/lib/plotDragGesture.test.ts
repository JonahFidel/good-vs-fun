// @ts-expect-error Node built-ins are available when this file runs under node:test.
import assert from 'node:assert/strict'
// @ts-expect-error Node built-ins are available when this file runs under node:test.
import test from 'node:test'
import { trackPendingMoviePointer } from './plotDragGesture.ts'

function pointerEvent(type: string, clientX = 0, clientY = 0) {
  return Object.assign(new Event(type), { clientX, clientY })
}

function pressMovie(start = { x: 100, y: 100 }) {
  const target = new EventTarget()
  const calls: string[] = []
  const dragPoints: { x: number; y: number }[] = []
  const stop = trackPendingMoviePointer(target, start, {
    onDragStart: (point) => {
      calls.push('drag')
      dragPoints.push(point)
    },
    onClick: () => calls.push('click'),
    onCancel: () => calls.push('cancel'),
  })
  return { target, calls, dragPoints, stop }
}

test('press, immediate move past 12px, and release drags a movie in one motion', () => {
  const { target, calls, dragPoints, stop } = pressMovie()

  target.dispatchEvent(pointerEvent('pointermove', 104, 100))
  assert.deepEqual(calls, [])
  target.dispatchEvent(pointerEvent('pointermove', 113, 100))
  target.dispatchEvent(pointerEvent('pointermove', 140, 120))
  target.dispatchEvent(pointerEvent('pointerup', 140, 120))
  stop()

  assert.deepEqual(calls, ['drag'])
  assert.deepEqual(dragPoints, [{ x: 113, y: 100 }])
})

test('a plain click on a movie selects it without dragging', () => {
  const { target, calls, stop } = pressMovie()

  target.dispatchEvent(pointerEvent('pointermove', 105, 103))
  target.dispatchEvent(pointerEvent('pointerup', 105, 103))
  target.dispatchEvent(pointerEvent('pointerup', 105, 103))
  stop()

  assert.deepEqual(calls, ['click'])
})

test('a second pointer cancels the pending movie press for pinch-zoom', () => {
  const { target, calls, stop } = pressMovie()

  target.dispatchEvent(pointerEvent('pointerdown', 200, 200))
  stop()
  target.dispatchEvent(pointerEvent('pointermove', 150, 100))

  assert.deepEqual(calls, ['cancel'])
})

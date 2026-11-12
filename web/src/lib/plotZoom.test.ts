// @ts-expect-error Node built-ins are available when this file runs under node:test.
import assert from 'node:assert/strict'
// @ts-expect-error Node built-ins are available when this file runs under node:test.
import test from 'node:test'
import { GRID_CANVAS } from './gridCanvas.ts'
import {
  MAX_SCALE,
  TARGET_LABEL_UNIT_PX,
  clampScale,
  labelsVisibleScale,
  pinchTransform,
} from './plotZoom.ts'

test('mobile titles become visible when an 88px score cell fits', () => {
  const canvasWidth = 390
  const threshold = labelsVisibleScale(canvasWidth)

  assert.equal(TARGET_LABEL_UNIT_PX, 88)
  assert.equal(threshold, TARGET_LABEL_UNIT_PX * GRID_CANVAS / canvasWidth)
  assert.ok(threshold < 93 * GRID_CANVAS / canvasWidth)
})

test('touch zoom is capped at 6x', () => {
  const zoomed = pinchTransform(
    { scale: 4, tx: 0, ty: 0 },
    { x: 100, y: 100 },
    100,
    { x: 100, y: 100 },
    200,
    { minScale: 1, maxScale: MAX_SCALE },
  )

  assert.equal(MAX_SCALE, 6)
  assert.equal(zoomed.scale, MAX_SCALE)
  assert.equal(clampScale(MAX_SCALE + 4), MAX_SCALE)
})

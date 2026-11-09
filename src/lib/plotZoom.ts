export type ZoomState = {
  scale: number
  tx: number
  ty: number
}

export type ZoomPoint = {
  x: number
  y: number
}

export const INITIAL_SCALE = 1
export const MIN_SCALE = 0.3
export const MAX_SCALE = 8
/** Pinch past this scale before unselected mobile titles come back. */
export const LABELS_VISIBLE_SCALE = 1.4
/** Double-tap zoom-in; above LABELS_VISIBLE_SCALE so titles appear. */
export const DOUBLE_TAP_SCALE = 2.2
const FIT_SCALE_EPSILON = 0.05
const FIT_PAN_EPSILON_PX = 8

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/** Zoom so that `point` (in slot coordinates) stays visually fixed. */
export function zoomTowardPoint(
  state: ZoomState,
  point: ZoomPoint,
  factor: number,
): ZoomState {
  const newScale = clampScale(state.scale * factor)
  const ratio = newScale / state.scale
  return {
    scale: newScale,
    tx: point.x - (point.x - state.tx) * ratio,
    ty: point.y - (point.y - state.ty) * ratio,
  }
}

/**
 * Two-finger pinch: scale around the original midpoint, then follow the
 * current midpoint so the gesture can pan and zoom at the same time.
 */
export function pinchTransform(
  origin: ZoomState,
  originMidpoint: ZoomPoint,
  originDistance: number,
  currentMidpoint: ZoomPoint,
  currentDistance: number,
): ZoomState {
  const factor = originDistance === 0 ? 1 : currentDistance / originDistance
  const newScale = clampScale(origin.scale * factor)
  const ratio = newScale / origin.scale
  return {
    scale: newScale,
    tx: currentMidpoint.x - (originMidpoint.x - origin.tx) * ratio,
    ty: currentMidpoint.y - (originMidpoint.y - origin.ty) * ratio,
  }
}

export function centeredTransform(
  slot: { width: number; height: number },
  canvas: { width: number; height: number },
  scale: number,
): ZoomState {
  return {
    scale,
    tx: (slot.width - canvas.width * scale) / 2,
    ty: (slot.height - canvas.height * scale) / 2,
  }
}

export function isNearFit(
  state: ZoomState,
  fit: ZoomState,
  scaleEpsilon = FIT_SCALE_EPSILON,
  panEpsilon = FIT_PAN_EPSILON_PX,
): boolean {
  return (
    Math.abs(state.scale - fit.scale) <= scaleEpsilon &&
    Math.abs(state.tx - fit.tx) <= panEpsilon &&
    Math.abs(state.ty - fit.ty) <= panEpsilon
  )
}

/** Toggle fit vs a detail zoom aimed at `point` (slot coordinates). */
export function doubleTapTransform(
  state: ZoomState,
  point: ZoomPoint,
  fit: ZoomState,
  detailScale = DOUBLE_TAP_SCALE,
): ZoomState {
  if (isNearFit(state, fit)) {
    return zoomTowardPoint(state, point, detailScale / state.scale)
  }
  return fit
}

export function pointerDistance(a: ZoomPoint, b: ZoomPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function pointerMidpoint(a: ZoomPoint, b: ZoomPoint): ZoomPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

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

export function pointerDistance(a: ZoomPoint, b: ZoomPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function pointerMidpoint(a: ZoomPoint, b: ZoomPoint): ZoomPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

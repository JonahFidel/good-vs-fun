export type ZoomState = {
  scale: number
  tx: number
  ty: number
}

export type ZoomPoint = {
  x: number
  y: number
}

export type ViewSize = {
  width: number
  height: number
}

export const INITIAL_SCALE = 1
export const MIN_SCALE = 0.3
export const MAX_SCALE = 8
/**
 * Pinch past this scale before odd ticks and half-unit lines return.
 * The wrapping selected title+score readout also ends here so pinch-to-read
 * is not covered by a half-square pill before other titles appear at 2.2x.
 */
export const GRID_DETAIL_SCALE = 1.4
/**
 * Double-tap zoom-in. Unselected titles wait until this scale: 1.4x on a
 * ~370px square is only ~43px per score unit, so 0.8rem / 7.25rem pills
 * still cover the grid you zoomed in to read.
 */
export const DOUBLE_TAP_SCALE = 2.2
/** Unselected mobile titles appear at double-tap zoom, not at 1.4x. */
export const LABELS_VISIBLE_SCALE = DOUBLE_TAP_SCALE
/**
 * Ghost compare titles wait until after double-tap zoom. Example decks
 * are 40+ movies, so revealing that overlay with primary titles covers
 * the names pinch-to-read is for.
 */
export const GHOST_LABELS_VISIBLE_SCALE = 3.2
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
  slot: ViewSize,
  canvas: ViewSize,
  scale: number,
): ZoomState {
  return {
    scale,
    tx: (slot.width - canvas.width * scale) / 2,
    ty: (slot.height - canvas.height * scale) / 2,
  }
}

/**
 * Keep a zoomed axis covering the slot. An undersized axis (letterbox
 * gutter or zoom-out) must keep its translation: force-centering it made
 * 1.2x wheel-zoom toward Fun=0 jump on desktop, and the same jump hits
 * iPad landscape where lockFit is on but the canvas is still letterboxed
 * in the desktop frame.
 */
function clampOverflow(
  translate: number,
  slotSize: number,
  scaledSize: number,
): number {
  // Strictly undersized: letterbox gutter / zoom-out. Keep tx so
  // zoom-toward-cursor on that leftover axis is not rewritten to center.
  // Equal or overflow: keep the axis covering the slot (ty=0 when it fills).
  if (scaledSize < slotSize - 0.5) {
    return translate
  }
  const min = slotSize - scaledSize
  return Math.min(0, Math.max(min, translate))
}

function fitsSlot(slot: ViewSize, canvas: ViewSize, scale: number): boolean {
  return (
    canvas.width * scale <= slot.width + 0.5 &&
    canvas.height * scale <= slot.height + 0.5
  )
}

/**
 * Coarse-pointer fit lock: never shrink below 1x, and re-center only while
 * the canvas still fits the slot. Inverse-scale holds ticks and markers at
 * screen size, so pinch-out below fit would explode those labels over a
 * shrinking grid.
 *
 * Overflow clamp is pointer-agnostic: a mouse must not pan a zoomed grid
 * off-screen, and a letterboxed leftover axis must not be force-centered
 * (that rewrote zoom-toward-cursor). Gated min-scale stays on the pointer,
 * not on whether the canvas fills the slot. A mouse still needs Figma-style
 * zoom-out when the plot happens to be square.
 */
export function clampToSlot(
  state: ZoomState,
  slot: ViewSize,
  canvas: ViewSize,
  lockFit = false,
): ZoomState {
  if (slot.width <= 0 || slot.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
    return state
  }
  const scale = lockFit
    ? Math.min(MAX_SCALE, Math.max(INITIAL_SCALE, state.scale))
    : clampScale(state.scale)
  if (lockFit && fitsSlot(slot, canvas, scale)) {
    return centeredTransform(slot, canvas, scale)
  }
  return {
    scale,
    tx: clampOverflow(state.tx, slot.width, canvas.width * scale),
    ty: clampOverflow(state.ty, slot.height, canvas.height * scale),
  }
}

/** True when a pan can actually move the canvas. */
export function canPan(
  state: ZoomState,
  slot: ViewSize,
  canvas: ViewSize,
  lockFit = false,
): boolean {
  if (slot.width <= 0 || slot.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
    return false
  }
  if (!lockFit) {
    return true
  }
  return (
    canvas.width * state.scale > slot.width + 0.5 ||
    canvas.height * state.scale > slot.height + 0.5
  )
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

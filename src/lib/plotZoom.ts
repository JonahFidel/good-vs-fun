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
 * Maps-style covering clamp: a zoomed axis must keep filling the slot.
 * iPhone pinch uses this so the fitted square you zoomed into cannot be
 * dragged away to empty space.
 */
function clampCovering(
  translate: number,
  slotSize: number,
  scaledSize: number,
): number {
  const min = slotSize - scaledSize
  return Math.min(0, Math.max(min, translate))
}

/**
 * Keep some of the canvas in the slot without forcing it to cover.
 *
 * Covering clamp rewrites zoom-toward-cursor once an axis overflows:
 * 2x toward Fun=0 wants tx≈174 on a 626px canvas in an 800px slot, but
 * covering pins tx to 0 (left-align). That is the same jump as
 * force-centering leftover axes, just delayed until the fill threshold,
 * and it hits the Fun=0 / Good=0 edges this grid is for.
 *
 * Original desktop zoom had no clamp. This floor only stops pan from
 * throwing the grid completely off-screen.
 */
const MIN_VISIBLE_PX = 48

function clampKeepVisible(
  translate: number,
  slotSize: number,
  scaledSize: number,
): number {
  const visible = Math.min(MIN_VISIBLE_PX, scaledSize, slotSize)
  const min = visible - scaledSize
  const max = slotSize - visible
  return Math.min(max, Math.max(min, translate))
}

function fillsAxisAtFit(slotSize: number, unscaledSize: number): boolean {
  return unscaledSize >= slotSize - 0.5
}

function clampAxis(
  translate: number,
  slotSize: number,
  scaledSize: number,
  unscaledSize: number,
  lockFit: boolean,
): number {
  const overflowing = scaledSize >= slotSize - 0.5
  // Covering is only safe on an axis that already filled at 1x (iPhone
  // square). iPad landscape uses the desktop letterbox, so leftover width
  // is a gutter: covering at overflow pins 2x-toward-Fun=0 from tx≈174
  // to 0, the same left-align jump as force-centering, just later.
  if (overflowing && lockFit && fillsAxisAtFit(slotSize, unscaledSize)) {
    return clampCovering(translate, slotSize, scaledSize)
  }
  return clampKeepVisible(translate, slotSize, scaledSize)
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
 * Zoomed iPhone axes use covering clamp so the square stays filled.
 * Covering follows unscaled fill, not lockFit alone: iPad landscape is
 * coarse (lockFit) but letterboxed, so leftover axes keep-visible even
 * after they overflow. Mouse always keep-visible. Gated min-scale stays
 * on the pointer, not on whether the canvas fills the slot.
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
    tx: clampAxis(
      state.tx,
      slot.width,
      canvas.width * scale,
      canvas.width,
      lockFit,
    ),
    ty: clampAxis(
      state.ty,
      slot.height,
      canvas.height * scale,
      canvas.height,
      lockFit,
    ),
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

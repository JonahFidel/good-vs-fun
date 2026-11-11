import { GRID_CANVAS } from './gridCanvas.ts'

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
export const MAX_SCALE = 6
/**
 * Pinch past this scale before odd ticks and half-unit lines return.
 * The wrapping selected title+score readout also ends here so pinch-to-read
 * is not covered by a half-square pill before other titles appear.
 */
export const GRID_DETAIL_SCALE = 1.4
/**
 * Floor for double-tap zoom-in and unselected titles. 1.4x on a ~370px
 * square is only ~43px per score unit, so 0.8rem / 7.25rem pills still
 * cover the grid you zoomed in to read. One-line 3.75rem pills needed
 * ~2.2x there; seven-line wrap is taller, so labelsVisibleScale() raises
 * double-tap until a cell is TARGET_LABEL_UNIT_PX.
 */
export const DOUBLE_TAP_SCALE = 2.2
/** Minimum mobile scale for unselected titles; smaller canvases raise it. */
export const LABELS_VISIBLE_SCALE = DOUBLE_TAP_SCALE
/**
 * Ghost compare titles wait until after double-tap zoom. Example decks
 * are 40+ movies, so revealing that overlay with primary titles covers
 * the names pinch-to-read is for.
 */
export const GHOST_LABELS_VISIBLE_SCALE = 3.2
/**
 * Screen-px per score unit required before mobile titles appear. Keeping
 * one title inside an 88px cell leaves enough room to read names while
 * avoiding the crowded grid at fit and light-pinch scales. Ghost labels
 * wait one additional zoom level so their seven-line wraps still fit.
 */
export const TARGET_LABEL_UNIT_PX = 88
const GHOST_LABELS_AFTER_PRIMARY = 1
const FIT_SCALE_EPSILON = 0.05
const FIT_PAN_EPSILON_PX = 8
/**
 * Pinch-out this close to 1x eases back to the readable square,
 * even if that leftover view was panned. Wider than FIT_SCALE_EPSILON
 * so a 1.1x leftover (tiny pan unlock) still lands on the locked 0-10 view.
 */
export const PINCH_SETTLE_SCALE_EPSILON = 0.15
/** How hard pinch/pan resist past min/max. 0.55 matches iOS rubber-band. */
const RUBBER_BAND_CONSTANT = 0.55

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/**
 * Compress an overshoot so pull-past-the-edge resists like iOS.
 * `dimension` 1 is scale (unitless); pan uses the slot size in px so a
 * 40px pull does not flatten the way a 40x scale overshoot would.
 */
function rubberBandOffset(overshoot: number, dimension: number): number {
  const dim = Math.max(1, dimension)
  return (overshoot * RUBBER_BAND_CONSTANT * dim) / (dim + overshoot)
}

/**
 * Resist past min/max so a pinch can overshoot, then settle on release.
 * Applied before pinch pan math so overshoot stays finger-anchored.
 */
export function rubberBandScale(scale: number, min: number, max: number): number {
  if (scale < min) {
    return min - rubberBandOffset(min - scale, 1)
  }
  if (scale > max) {
    return max + rubberBandOffset(scale - max, 1)
  }
  return scale
}

/** Resist past a covering or keep-visible pan edge while a finger is down or inertia is coasting. */
export function rubberBandTranslate(
  translate: number,
  min: number,
  max: number,
  dimension: number,
): number {
  if (translate < min) {
    return min - rubberBandOffset(min - translate, dimension)
  }
  if (translate > max) {
    return max + rubberBandOffset(translate - max, dimension)
  }
  return translate
}

/**
 * Zoom at which unselected titles can sit one-per-cell. Never below 2.2x.
 * On a typical phone square, TARGET_LABEL_UNIT_PX binds first so seven-line
 * 3.75rem pills fit one Fun cell. Smaller filled squares raise it further.
 */
export function labelsVisibleScale(canvasWidth: number): number {
  const unitAtFit = canvasWidth / GRID_CANVAS
  if (unitAtFit <= 0) return DOUBLE_TAP_SCALE
  return Math.min(
    MAX_SCALE,
    Math.max(DOUBLE_TAP_SCALE, TARGET_LABEL_UNIT_PX / unitAtFit),
  )
}

/** Ghost names stay hidden until primary titles have room, then one extra 1x. */
export function ghostLabelsVisibleScale(canvasWidth: number): number {
  return Math.min(
    MAX_SCALE,
    Math.max(
      GHOST_LABELS_VISIBLE_SCALE,
      labelsVisibleScale(canvasWidth) + GHOST_LABELS_AFTER_PRIMARY,
    ),
  )
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

export type PinchTransformOpts = {
  minScale?: number
  maxScale?: number
  rubberBand?: boolean
}

/**
 * Two-finger pinch: scale around the original midpoint, then follow the
 * current midpoint so the gesture can pan and zoom at the same time.
 * Rubber-band compresses scale before the pan math so overshoot stays
 * anchored on the fingers instead of using an unclamped ratio.
 */
export function pinchTransform(
  origin: ZoomState,
  originMidpoint: ZoomPoint,
  originDistance: number,
  currentMidpoint: ZoomPoint,
  currentDistance: number,
  opts?: PinchTransformOpts,
): ZoomState {
  const factor = originDistance === 0 ? 1 : currentDistance / originDistance
  const minScale = opts?.minScale ?? MIN_SCALE
  const maxScale = opts?.maxScale ?? MAX_SCALE
  const rawScale = origin.scale * factor
  const newScale = opts?.rubberBand
    ? rubberBandScale(rawScale, minScale, maxScale)
    : Math.min(maxScale, Math.max(minScale, rawScale))
  const ratio = origin.scale === 0 ? 1 : newScale / origin.scale
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

function keepVisibleBounds(slotSize: number, scaledSize: number) {
  const visible = Math.min(MIN_VISIBLE_PX, scaledSize, slotSize)
  return {
    min: visible - scaledSize,
    max: slotSize - visible,
  }
}

function clampKeepVisible(
  translate: number,
  slotSize: number,
  scaledSize: number,
): number {
  const { min, max } = keepVisibleBounds(slotSize, scaledSize)
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
  rubberBand = false,
): number {
  const overflowing = scaledSize >= slotSize - 0.5
  // Covering is only safe on an axis that already filled at 1x (iPhone
  // square). iPad landscape uses the desktop letterbox, so leftover width
  // is a gutter: covering at overflow pins 2x-toward-Fun=0 from tx≈174
  // to 0, the same left-align jump as force-centering, just later.
  if (overflowing && lockFit && fillsAxisAtFit(slotSize, unscaledSize)) {
    if (rubberBand) {
      return rubberBandTranslate(translate, slotSize - scaledSize, 0, slotSize)
    }
    return clampCovering(translate, slotSize, scaledSize)
  }
  // Leftover axes (iPad landscape letterbox, desktop gutters) keep-visible
  // clamp so 2x-toward-Fun=0 is not left-aligned. Coarse pan/inertia used
  // to hard-stop there while covering iPhone axes bounced; rubber-band
  // those bounds too so a flicked leftover edge eases back the same way.
  if (rubberBand) {
    const { min, max } = keepVisibleBounds(slotSize, scaledSize)
    return rubberBandTranslate(translate, min, max, slotSize)
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
 * Coarse-pointer fit lock: never shrink below 1x after a gesture, and
 * re-center only while the canvas still fits the slot. A settled pinch-out
 * below fit would shrink the chart and shift the labels from their anchors.
 *
 * Live pinch/pan/inertia can pass rubberBand to paint a resisted overshoot;
 * clamp must not re-floor that scale or covering/keep-visible-pin pan.
 * Zoomed iPhone axes use covering clamp so the square stays filled.
 * Covering follows unscaled fill, not lockFit alone: iPad landscape
 * is coarse (lockFit) but letterboxed, so leftover axes keep-visible
 * even after they overflow, and rubber-band those 48px bounds instead
 * of hard-stopping. Mouse always keep-visible without rubber-band.
 * Gated min-scale stays on the pointer, not on whether the canvas fills
 * the slot.
 */
export function clampToSlot(
  state: ZoomState,
  slot: ViewSize,
  canvas: ViewSize,
  lockFit = false,
  rubberBand = false,
): ZoomState {
  if (slot.width <= 0 || slot.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
    return state
  }
  // Rubber-band pinch already compressed scale; do not re-floor it or
  // the overshoot never paints. Rubber-band pan also has to skip the
  // covering and keep-visible pins or pull-past-the-edge never paints.
  const scale = rubberBand
    ? state.scale
    : lockFit
      ? Math.min(MAX_SCALE, Math.max(INITIAL_SCALE, state.scale))
      : clampScale(state.scale)
  // Recenter a fitted coarse view, but not a live pinch-out: fitsSlot
  // is true below 1x, and recentering would shrink from the slot center
  // instead of the pinch midpoint.
  if (
    lockFit &&
    fitsSlot(slot, canvas, scale) &&
    !(rubberBand && scale < INITIAL_SCALE)
  ) {
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
      rubberBand,
    ),
    ty: clampAxis(
      state.ty,
      slot.height,
      canvas.height * scale,
      canvas.height,
      lockFit,
      rubberBand,
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

/**
 * True when scale is close enough to fit that covering pan should not
 * unlock. Pan offset is ignored: a 1.1x view dragged a few cells is
 * still an almost-home leftover, not a deliberate zoomed corner.
 */
export function isLeftoverFitScale(
  scale: number,
  fitScale: number,
  epsilon = PINCH_SETTLE_SCALE_EPSILON,
): boolean {
  return Math.abs(scale - fitScale) <= epsilon
}

/**
 * Toggle the readable 0-10 overview vs a detail zoom aimed at `point`.
 *
 * Titles stay hidden until `detailScale` (at least 2.2x, higher on small
 * squares) so labels have room to stay readable without crowding cells.
 * A leftover pinch below that scale is still that overview: treating it as
 * "already zoomed" made one-handed double-tap reset to fit instead of
 * finishing the zoom you use to read names. Once titles are visible,
 * double-tap returns to the locked 0-10 square.
 */
export function doubleTapTransform(
  state: ZoomState,
  point: ZoomPoint,
  fit: ZoomState,
  detailScale = DOUBLE_TAP_SCALE,
): ZoomState {
  if (state.scale < detailScale) {
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

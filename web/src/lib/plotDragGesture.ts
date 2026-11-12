/** Movement past this distance starts a movie drag instead of a click. */
export const MOVIE_DRAG_MOVE_PX = 12

/** Delay before a coarse-pointer movie press can become a plot pan. */
export const DEFERRED_PAN_HOLD_MS = 120

export function crossedMovieDragThreshold(
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
) {
  return Math.hypot(clientX - startX, clientY - startY) >= MOVIE_DRAG_MOVE_PX
}

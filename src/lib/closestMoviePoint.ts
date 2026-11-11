/**
 * Screen-space radius of the iPhone movie hit ring: an 11px marker plus the
 * 16px ::before inset. Used for nearest-movie tap selection and to keep
 * those taps from counting as double-tap zoom. Mouse pan does not use this
 * radius; desktop markers are 7px and hold-to-drag already starts from
 * .movie-point.
 */
export const MOVIE_HIT_RADIUS_PX = 22

function pointInRect(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

function distanceToRectCenter(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): number {
  return Math.hypot(
    clientX - (rect.left + rect.width / 2),
    clientY - (rect.top + rect.height / 2),
  )
}

/** True when the label is actually painted, not an opacity-0 fit-zoom pill. */
function isPainted(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  const style = getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none') return false
  return parseFloat(style.opacity) > 0
}

function idFromLabelAtPoint(
  label: HTMLElement,
  clientX: number,
  clientY: number,
): { id: string; dist: number } | null {
  let closestTitle: { id: string; dist: number } | null = null

  for (const title of label.querySelectorAll('[data-movie-id]')) {
    if (!(title instanceof HTMLElement) || !isPainted(title)) continue
    const titleRect = title.getBoundingClientRect()
    if (!pointInRect(titleRect, clientX, clientY)) continue
    const id = title.getAttribute('data-movie-id')
    if (!id) continue
    const dist = distanceToRectCenter(titleRect, clientX, clientY)
    if (!closestTitle || dist < closestTitle.dist) {
      closestTitle = { id, dist }
    }
  }

  if (closestTitle) {
    return closestTitle
  }

  const selected = label.querySelector(
    '.movie-label-line--selected [data-movie-id]',
  )
  const any = selected ?? label.querySelector('[data-movie-id]')
  if (!(any instanceof HTMLElement)) {
    return null
  }
  const id = any.getAttribute('data-movie-id')
  if (!id) {
    return null
  }
  return {
    id,
    dist: distanceToRectCenter(label.getBoundingClientRect(), clientX, clientY),
  }
}

/**
 * Marker whose painted title pill contains the pointer. iPhone labels stay
 * pointer-events: none so nearby 44px markers remain tappable; callers
 * that need the title itself have to hit-test screen rects.
 *
 * Fit-zoom and light-pinch unselected pills are opacity 0 and skipped.
 * After double-tap / deep pinch every title is painted.
 *
 * A selected wrapping pill can cover a neighbor's truncated title. Returning
 * the first DOM hit would switch away from the title you are reading; prefer
 * the selected pill when it contains the tap, otherwise the closest title.
 */
export function moviePointAtVisibleLabel(
  root: ParentNode,
  clientX: number,
  clientY: number,
): HTMLElement | null {
  let selectedPoint: HTMLElement | null = null
  let closest: { point: HTMLElement; dist: number } | null = null

  for (const point of root.querySelectorAll('.movie-point:not(.ghost-point)')) {
    if (!(point instanceof HTMLElement)) continue
    const label = point.querySelector(':scope > .movie-label')
    if (!(label instanceof HTMLElement) || !isPainted(label)) continue
    if (!pointInRect(label.getBoundingClientRect(), clientX, clientY)) continue

    const hit = idFromLabelAtPoint(label, clientX, clientY)
    if (!hit) continue
    if (point.classList.contains('movie-point--selected')) {
      selectedPoint = point
    }
    if (!closest || hit.dist < closest.dist) {
      closest = { point, dist: hit.dist }
    }
  }

  return selectedPoint ?? closest?.point ?? null
}

/**
 * Movie whose on-canvas title (or the pill that contains it) the pointer is
 * over. Used to select the name you just read after titles appear.
 */
export function movieIdAtVisibleLabel(
  root: ParentNode,
  clientX: number,
  clientY: number,
): string | null {
  const point = moviePointAtVisibleLabel(root, clientX, clientY)
  if (!point) return null
  const label = point.querySelector(':scope > .movie-label')
  if (!(label instanceof HTMLElement)) return null
  return idFromLabelAtPoint(label, clientX, clientY)?.id ?? null
}

/**
 * True when a screen-space point lands on a painted title pill, including
 * compare overlay names. Those pills are pointer-events: none, so a tap
 * would otherwise count as empty grid (deselect / double-tap zoom-out)
 * or fall through to a nearby primary 44px ring and change selection.
 *
 * Ghost titles have no data-movie-id, so moviePointAtVisibleLabel cannot
 * see them; this only needs a painted box. Opacity-0 pills (fit-zoom
 * unselected names, ghosts before 3.2x) stay skipped.
 */
export function pointerHitsVisibleMovieLabel(
  root: ParentNode,
  clientX: number,
  clientY: number,
): boolean {
  for (const point of root.querySelectorAll('.movie-point')) {
    if (!(point instanceof HTMLElement)) continue
    const label = point.querySelector(':scope > .movie-label')
    if (!(label instanceof HTMLElement) || !isPainted(label)) continue
    if (pointInRect(label.getBoundingClientRect(), clientX, clientY)) {
      return true
    }
  }
  return false
}

/**
 * True when a screen-space point lands on a compare overlay marker.
 * Ghosts are pointer-events: none, so a tap on that colored dot would
 * otherwise count as empty grid (fit-zoom deselect, or zoom-out once
 * overlay names are on). Use the painted 11px/7px box, not the 44px
 * primary ring: expanding every overlay movie to 22px would eat the
 * empty space one-handed double-tap zoom needs on a 40-film compare.
 *
 * Isolated overlay movies are the hole. A ghost sitting inside a
 * primary 44px ring still loses to marker-first select/cycle.
 */
export function pointerHitsGhostMarker(
  root: ParentNode,
  clientX: number,
  clientY: number,
): boolean {
  for (const point of root.querySelectorAll('.ghost-point')) {
    if (!(point instanceof HTMLElement)) continue
    if (pointInRect(point.getBoundingClientRect(), clientX, clientY)) {
      return true
    }
  }
  return false
}

function movieIdsInPoint(point: Element): string[] {
  const ids: string[] = []
  for (const node of point.querySelectorAll('[data-movie-id]')) {
    const id = node.getAttribute('data-movie-id')
    if (id) {
      ids.push(id)
    }
  }
  return ids
}

/** Next title in a stacked group, wrapping so every movie at the dot is reachable. */
export function nextMovieIdInGroup(
  ids: string[],
  selectedId: string | null,
): string | null {
  if (ids.length === 0) {
    return null
  }
  const idx = selectedId ? ids.indexOf(selectedId) : -1
  if (idx >= 0) {
    return ids[(idx + 1) % ids.length]
  }
  return ids[0]
}

/**
 * Nearest non-ghost movie to a tap. Overlapping 44px hit rings otherwise
 * select whichever point is on top in DOM order, which on a dense fitted
 * iPhone grid is often not the dot you aimed at.
 *
 * Movies that share a Fun/Good score render as one marker. A second tap on
 * that marker advances to the next title. After double-tap / deep pinch,
 * movieIdAtVisibleLabel can select a listed title directly because the pills
 * stay pointer-events: none so they cannot receive the tap themselves.
 */
export function closestMovieId(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
  maxDistance = MOVIE_HIT_RADIUS_PX,
  selectedId: string | null = null,
): string | null {
  let best: { ids: string[]; dist: number } | null = null

  for (const point of grid.querySelectorAll('.movie-point:not(.ghost-point)')) {
    const rect = point.getBoundingClientRect()
    const dist = distanceToRectCenter(rect, clientX, clientY)
    if (dist > maxDistance) {
      continue
    }
    if (best && dist >= best.dist) {
      continue
    }
    const ids = movieIdsInPoint(point)
    if (ids.length) {
      best = { ids, dist }
    }
  }

  return best ? nextMovieIdInGroup(best.ids, selectedId) : null
}

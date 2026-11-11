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
 *
 * PlotGridZoom keeps this movie-point from the first tap of a title
 * double-tap. Below 2.2x the 32cqw wrap can cover an overlay dot, and
 * iPhone jitter often misses the pill, so the follow-up must still zoom
 * this marker to 2.2x instead of 3.2x toward the ghost or toward the
 * tap on the wrap. At 2.2x/3.2x the same stored point eases home, and
 * blocks overlay 3.2x steal when that name covers a ghost. Jitter
 * toward the marker lands in the 44px ring; that follow-up still
 * zooms this point instead of cancelling as select/cycle, and its
 * pointerdown must not select/cycle either or a stack advances / the
 * Selected bar switches while the ease runs.
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
 * would otherwise count as empty grid (deselect) or fall through to a
 * nearby primary 44px ring and change selection. At 2.2x/3.2x a first
 * tap on that pill starts one-handed zoom-out; overlay names have no
 * movie id, so this check is also what keeps that tap from deselecting.
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
 * Compare overlay marker whose painted 11px/7px box contains the pointer.
 * Ghosts are pointer-events: none, so a tap on that colored dot would
 * otherwise count as empty grid (fit-zoom deselect, or zoom-out once
 * overlay names are on at 3.2x). Use the painted box, not the 44px
 * primary ring: expanding every overlay movie to 22px would eat the
 * empty space one-handed double-tap zoom needs on a 40-film compare.
 *
 * Isolated overlay movies are the hole. A ghost sitting inside a
 * primary 44px ring still loses to marker-first select/cycle on a
 * first tap. Completing an overlay double-tap must keep this point
 * even when the follow-up lands in that nearby ring, or 28px jitter
 * selects the primary instead of finishing 3.2x. Completing
 * empty-space or painted-title zoom-out is the same: those rings sit
 * under 2.2x titles, so marker-first on the follow-up cancelled the
 * way back to fit. That follow-up pointerdown must not onTouchSelect
 * the primary either. A ghost under the second tap of an empty-space
 * pair must not start overlay zoom-in: that follow-up is 28px
 * jitter, and at 2.2x it would steal 3.2x instead of zooming back
 * to the locked 0-10 square. A first tap on a painted name that
 * covers this marker stores the title so the same steal cannot
 * start from the name itself.
 *
 * Below 3.2x the overlay name is still hidden, so callers zoom toward
 * this marker's center (not the tap) until ghost titles appear. The
 * box is only 11px; iPhone double-tap jitter often misses it on the
 * second tap, so PlotGridZoom keeps this element from the first tap
 * instead of expanding the hit ring.
 */
export function ghostPointAtMarker(
  root: ParentNode,
  clientX: number,
  clientY: number,
): HTMLElement | null {
  for (const point of root.querySelectorAll('.ghost-point')) {
    if (!(point instanceof HTMLElement)) continue
    if (pointInRect(point.getBoundingClientRect(), clientX, clientY)) {
      return point
    }
  }
  return null
}

export function pointerHitsGhostMarker(
  root: ParentNode,
  clientX: number,
  clientY: number,
): boolean {
  return ghostPointAtMarker(root, clientX, clientY) != null
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

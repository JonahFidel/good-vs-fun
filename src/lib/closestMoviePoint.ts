/**
 * Screen-space radius of the iPhone movie hit ring: an 11px marker plus the
 * 16px ::before inset, matching PlotGridZoom's pan dead zone.
 */
export const MOVIE_HIT_RADIUS_PX = 22

/**
 * On-canvas title pills that are visible on iPhone. Those labels use
 * pointer-events: none so nearby markers stay tappable, which also lets a
 * tap fall through to empty grid and deselect or double-tap zoom.
 */
export const VISIBLE_MOVIE_LABEL_SELECTOR =
  '.movie-point--selected > .movie-label, .movie-point.dragging > .movie-label, .movie-point--highlighted > .movie-label'

/** True when a screen-space point lands inside an element matching `selector`. */
export function pointerHitsSelector(
  root: ParentNode,
  selector: string,
  clientX: number,
  clientY: number,
): boolean {
  for (const node of root.querySelectorAll(selector)) {
    if (!(node instanceof HTMLElement)) continue
    const rect = node.getBoundingClientRect()
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
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
 * that marker advances to the next title; labels are pointer-events: none
 * on iPhone so the titles in the stack cannot be tapped directly.
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
    const dist = Math.hypot(
      clientX - (rect.left + rect.width / 2),
      clientY - (rect.top + rect.height / 2),
    )
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

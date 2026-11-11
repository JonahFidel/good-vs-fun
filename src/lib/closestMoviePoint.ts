/**
 * Screen-space radius of the iPhone movie hit ring: an 11px marker plus the
 * 16px ::before inset, matching PlotGridZoom's pan dead zone.
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

/** True when the label is actually painted, not an opacity-0 fit-zoom pill. */
function isPainted(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  const style = getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none') return false
  return parseFloat(style.opacity) > 0
}

/**
 * Movie whose on-canvas title (or the pill that contains it) the pointer is
 * over. iPhone labels stay pointer-events: none so nearby 44px markers remain
 * tappable; callers that need the title itself have to hit-test screen rects.
 *
 * Fit-zoom unselected pills are opacity 0 and skipped. After pinch/double-tap
 * every title is painted, so this is how you select the movie you just read
 * instead of missing it or double-tap zooming.
 */
export function movieIdAtVisibleLabel(
  root: ParentNode,
  clientX: number,
  clientY: number,
): string | null {
  let pillFallback: string | null = null

  for (const point of root.querySelectorAll('.movie-point:not(.ghost-point)')) {
    const label = point.querySelector(':scope > .movie-label')
    if (!(label instanceof HTMLElement) || !isPainted(label)) continue
    if (!pointInRect(label.getBoundingClientRect(), clientX, clientY)) continue

    for (const title of label.querySelectorAll('[data-movie-id]')) {
      if (!(title instanceof HTMLElement) || !isPainted(title)) continue
      if (!pointInRect(title.getBoundingClientRect(), clientX, clientY)) continue
      return title.getAttribute('data-movie-id')
    }

    if (pillFallback === null) {
      const selected = label.querySelector(
        '.movie-label-line--selected [data-movie-id]',
      )
      const any = selected ?? label.querySelector('[data-movie-id]')
      if (any instanceof HTMLElement) {
        pillFallback = any.getAttribute('data-movie-id')
      }
    }
  }

  return pillFallback
}

/** True when a screen-space point lands on a painted movie title pill. */
export function pointerHitsVisibleMovieLabel(
  root: ParentNode,
  clientX: number,
  clientY: number,
): boolean {
  return movieIdAtVisibleLabel(root, clientX, clientY) !== null
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
 * that marker advances to the next title. After pinch, movieIdAtVisibleLabel
 * can select a listed title directly because the pills stay pointer-events:
 * none so they cannot receive the tap themselves.
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

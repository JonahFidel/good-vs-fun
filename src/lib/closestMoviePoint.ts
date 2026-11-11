/**
 * Screen-space radius of the iPhone movie hit ring: an 11px marker plus the
 * 16px ::before inset, matching PlotGridZoom's pan dead zone.
 */
export const MOVIE_HIT_RADIUS_PX = 22

/**
 * Nearest non-ghost movie to a tap. Overlapping 44px hit rings otherwise
 * select whichever point is on top in DOM order, which on a dense fitted
 * iPhone grid is often not the dot you aimed at.
 */
export function closestMovieId(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
  maxDistance = MOVIE_HIT_RADIUS_PX,
): string | null {
  let best: { id: string; dist: number } | null = null

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
    const id = point.querySelector('[data-movie-id]')?.getAttribute('data-movie-id')
    if (id) {
      best = { id, dist }
    }
  }

  return best?.id ?? null
}

import { snapScoreToStep } from './format'
import { pointerRatioToScore } from './gridCanvas'
import { groupByPosition } from './groupByPosition'
import type { Movie } from './types'

/** Drop counts as the same cell once this fraction of the smaller rect overlaps. */
const SAME_CELL_OVERLAP = 0.8

export type SnapDrag = {
  type: 'group' | 'single'
  key: string
  ids: string[]
}

export type PlotScore = {
  fun: number
  good: number
}

function rectIntersectionArea(a: DOMRect, b: DOMRect) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  return width * height
}

function overlapRatio(a: DOMRect, b: DOMRect) {
  const smallerArea = Math.min(a.width * a.height, b.width * b.height)
  if (smallerArea === 0) {
    return 0
  }
  return rectIntersectionArea(a, b) / smallerArea
}

function elementRects(elements: Array<Element | null>) {
  return elements.flatMap((element) =>
    element instanceof HTMLElement ? [element.getBoundingClientRect()] : [],
  )
}

/** The point and label being dragged, so a drop can land on either shape. */
function draggedElementRects(grid: HTMLElement, dragging: SnapDrag) {
  if (dragging.type === 'single') {
    const title = grid.querySelector(`[data-movie-id="${CSS.escape(dragging.key)}"]`)
    return elementRects([title, title?.closest('.movie-point') ?? null])
  }

  const point = grid.querySelector(
    `.movie-point[data-group-key="${CSS.escape(dragging.key)}"]`,
  )
  return elementRects([point, point?.querySelector('.movie-label') ?? null])
}

/**
 * Same-cell snap: if the drag overlaps another movie's dot or label, use that cell.
 * Cells the drag itself occupies are ignored.
 */
function sameCellScore(
  grid: HTMLElement,
  movies: Movie[],
  dragging: SnapDrag,
  draggedRects: DOMRect[],
): PlotScore | null {
  if (draggedRects.length === 0) {
    return null
  }

  const excluded = new Set(dragging.ids)
  const groups = groupByPosition(movies.filter((movie) => !excluded.has(movie.id)))
  let best: (PlotScore & { ratio: number }) | null = null

  for (const group of groups) {
    const groupEl = grid.querySelector(
      `.movie-point[data-group-key="${CSS.escape(group.key)}"]`,
    )
    if (!(groupEl instanceof HTMLElement)) {
      continue
    }

    const targets = [
      groupEl.getBoundingClientRect(),
      ...elementRects(Array.from(groupEl.querySelectorAll('[data-movie-id]'))),
    ]

    for (const draggedRect of draggedRects) {
      for (const target of targets) {
        const ratio = overlapRatio(draggedRect, target)
        if (ratio >= SAME_CELL_OVERLAP && (!best || ratio > best.ratio)) {
          best = { fun: group.fun, good: group.good, ratio }
        }
      }
    }
  }

  return best ? { fun: best.fun, good: best.good } : null
}

/** Step-grid snap for a pointer that is already inside the plot. */
export function scoresAtPointer(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
): PlotScore {
  const rect = grid.getBoundingClientRect()
  const clampedX = Math.min(Math.max(clientX - rect.left, 0), rect.width)
  const clampedY = Math.min(Math.max(clientY - rect.top, 0), rect.height)

  return {
    good: snapScoreToStep(pointerRatioToScore(clampedX / rect.width)),
    fun: snapScoreToStep(pointerRatioToScore(1 - clampedY / rect.height)),
  }
}

/**
 * Prefer the movie cell under the drop. Otherwise snap to the plot step under the pointer.
 * Returns null when the plot element is not mounted.
 */
export function findSnapTarget(
  grid: HTMLElement | null,
  movies: Movie[],
  dragging: SnapDrag,
  clientX: number,
  clientY: number,
): PlotScore | null {
  if (!grid) {
    return null
  }

  return (
    sameCellScore(grid, movies, dragging, draggedElementRects(grid, dragging)) ??
    scoresAtPointer(grid, clientX, clientY)
  )
}

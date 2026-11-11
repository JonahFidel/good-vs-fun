import { formatScore } from '../../lib/format'
import type { MovieHover } from '../../lib/types'
import { scoreToPlotPercent } from '../../lib/gridCanvas'
import type { PositionGroup } from '../../lib/groupByPosition'

/** Put the title on the roomier side so a selected pill stays inside the square. */
const LABEL_FLIP_GOOD = 5
/** Grow the selected pill down so a stacked title+score stays on-canvas at Fun 9–10. */
const LABEL_SOUTH_FUN = 9
/** Grow the selected pill up so a stacked title+score stays on-canvas at Fun 0–1. */
const LABEL_NORTH_FUN = 1
/** Grow into the Good 10 gutter at labels-visible zoom (CSS), matching Fun 9-10. */
const LABEL_GUTTER_GOOD_HIGH = 9
/** Grow into the Good 0 gutter at labels-visible zoom (CSS), matching Fun 0-1. */
const LABEL_GUTTER_GOOD_LOW = 1
/**
 * Centered 7-line pills extend ±0.5 Fun units at labels-visible zoom, so
 * same-Good neighbors closer than one unit cover each other. Pair them
 * instead of using the Fun 9-10 / Fun 0-1 edge classes, which would also
 * move the fit-zoom selected pill into the square.
 */
const INTERIOR_SAME_GOOD_FUN_GAP = 1
/** Slide the stack-count chip left so Fun/Good ≈10 does not clip it in the 1-unit margin. */
const COUNT_WEST_GOOD = 9

function interiorSameGoodVerticalStagger(
  groups: PositionGroup[],
): Map<string, 'fun-10' | 'fun-0'> {
  const stagger = new Map<string, 'fun-10' | 'fun-0'>()
  const interiorUnstacked = groups.filter(
    (group) =>
      group.items.length === 1 &&
      group.fun > LABEL_NORTH_FUN &&
      group.fun < LABEL_SOUTH_FUN &&
      group.good > LABEL_GUTTER_GOOD_LOW &&
      group.good < LABEL_GUTTER_GOOD_HIGH,
  )
  const byGood = new Map<number, PositionGroup[]>()
  for (const group of interiorUnstacked) {
    const list = byGood.get(group.good)
    if (list) list.push(group)
    else byGood.set(group.good, [group])
  }
  for (const list of byGood.values()) {
    if (list.length !== 2) continue
    const [higher, lower] =
      list[0].fun >= list[1].fun ? [list[0], list[1]] : [list[1], list[0]]
    const gap = higher.fun - lower.fun
    if (gap > 0 && gap <= INTERIOR_SAME_GOOD_FUN_GAP) {
      stagger.set(higher.key, 'fun-10')
      stagger.set(lower.key, 'fun-0')
    }
  }
  return stagger
}

export function MoviePoints({
  groups,
  draggingIds,
  selectedMovieId,
  hover,
  onGroupPointerDown,
  onLabelPointerDown,
  onHighlight,
  onClearHover,
}: {
  groups: PositionGroup[]
  draggingIds: string[] | null
  selectedMovieId: string | null
  hover: MovieHover | null
  onGroupPointerDown: (
    key: string,
    ids: string[],
    primaryId: string,
  ) => (event: React.PointerEvent<HTMLDivElement>) => void
  onLabelPointerDown: (
    id: string,
  ) => (event: React.PointerEvent<HTMLSpanElement>) => void
  onHighlight: (id: string) => void
  onClearHover: () => void
}) {
  const verticalStagger = interiorSameGoodVerticalStagger(groups)

  return (
    <>
      {groups.map((group) => {
        const ids = group.items.map((item) => item.id)
        const left = scoreToPlotPercent(group.good, 'x')
        const top = scoreToPlotPercent(group.fun, 'y')
        const isDragging = draggingIds
          ? ids.some((id) => draggingIds.includes(id))
          : false
        const isGridHighlighted = hover?.from === 'list' && ids.includes(hover.id)
        const isGridSelected = selectedMovieId !== null && ids.includes(selectedMovieId)
        const onlyItem = group.items.length === 1 ? group.items[0] : null
        const labelOnRight = group.good < LABEL_FLIP_GOOD
        const labelBelow = group.fun >= LABEL_SOUTH_FUN
        const labelAbove = !labelBelow && group.fun <= LABEL_NORTH_FUN
        const staggerTowardFun10 = verticalStagger.get(group.key) === 'fun-10'
        const staggerTowardFun0 = verticalStagger.get(group.key) === 'fun-0'
        const gutterIntoGood10 = group.good >= LABEL_GUTTER_GOOD_HIGH
        const gutterIntoGood0 =
          !gutterIntoGood10 && group.good <= LABEL_GUTTER_GOOD_LOW
        const countOnLeft = group.good >= COUNT_WEST_GOOD

        return (
          <div
            key={group.key}
            className={[
              'movie-point',
              isDragging ? 'dragging' : '',
              isGridSelected ? 'movie-point--selected' : '',
              isGridHighlighted ? 'movie-point--highlighted' : '',
              group.items.length > 1 ? 'movie-point--stacked' : '',
              labelOnRight ? 'movie-point--label-end' : '',
              labelBelow ? 'movie-point--label-south' : '',
              labelAbove ? 'movie-point--label-north' : '',
              staggerTowardFun10 ? 'movie-point--stagger-fun-10' : '',
              staggerTowardFun0 ? 'movie-point--stagger-fun-0' : '',
              gutterIntoGood10 ? 'movie-point--gutter-good-10' : '',
              gutterIntoGood0 ? 'movie-point--gutter-good-0' : '',
              countOnLeft ? 'movie-point--count-west' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: `${left}%`, top: `${top}%` }}
            onPointerDown={onGroupPointerDown(group.key, ids, group.items[0].id)}
            onPointerEnter={
              onlyItem
                ? (event) => {
                    // iOS synthesizes mouseenter after a tap and never
                    // mouseleave, which would leave a title+score pill on
                    // the fitted grid after deselect. Hover-link is mouse.
                    if (event.pointerType === 'touch') return
                    onHighlight(onlyItem.id)
                  }
                : undefined
            }
            onPointerLeave={
              onlyItem
                ? (event) => {
                    if (event.pointerType === 'touch') return
                    onClearHover()
                  }
                : undefined
            }
            data-group-key={group.key}
          >
            <span
              className="movie-label"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
            >
              {group.items.map((item) => (
                <span
                  key={item.id}
                  className={[
                    'movie-label-line',
                    selectedMovieId === item.id ? 'movie-label-line--selected' : '',
                    hover?.from === 'list' && hover.id === item.id
                      ? 'movie-label-line--linked'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span
                    className="movie-label-title"
                    data-movie-id={item.id}
                    onPointerDownCapture={onLabelPointerDown(item.id)}
                    onPointerEnter={(event) => {
                      if (event.pointerType === 'touch') return
                      onHighlight(item.id)
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType === 'touch') return
                      onClearHover()
                    }}
                  >
                    {item.title}
                  </span>
                </span>
              ))}
              <span className="movie-label-score">
                <span>Good {formatScore(group.good)}</span>
                <span>Fun {formatScore(group.fun)}</span>
              </span>
            </span>
            {group.items.length > 1 ? (
              <span className="movie-point-count" aria-hidden="true">
                {group.items.length}
              </span>
            ) : null}
            <span className="movie-point-score" aria-hidden="true">
              Good {formatScore(group.good)} · Fun {formatScore(group.fun)}
            </span>
          </div>
        )
      })}
    </>
  )
}

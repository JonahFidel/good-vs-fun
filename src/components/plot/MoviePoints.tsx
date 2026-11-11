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

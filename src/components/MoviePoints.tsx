import type { MovieHover } from './deck/MovieList'
import { formatScore } from '../lib/format'
import { scoreToPlotPercent } from '../lib/gridCanvas'
import type { PositionGroup } from '../lib/groupByPosition'

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

        return (
          <div
            key={group.key}
            className={[
              'movie-point',
              isDragging ? 'dragging' : '',
              isGridSelected ? 'movie-point--selected' : '',
              isGridHighlighted ? 'movie-point--highlighted' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: `${left}%`, top: `${top}%` }}
            onPointerDown={onGroupPointerDown(group.key, ids, group.items[0].id)}
            onMouseEnter={onlyItem ? () => onHighlight(onlyItem.id) : undefined}
            onMouseLeave={onlyItem ? onClearHover : undefined}
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
                    onMouseEnter={() => onHighlight(item.id)}
                    onMouseLeave={onClearHover}
                  >
                    {item.title}
                  </span>
                </span>
              ))}
            </span>
            <span className="movie-point-score" aria-hidden="true">
              Good {formatScore(group.good)} · Fun {formatScore(group.fun)}
            </span>
          </div>
        )
      })}
    </>
  )
}

import { scoreToPlotPercent } from '../../lib/gridCanvas'
import type { PositionGroup } from '../../lib/groupByPosition'

/** Ghost titles sit on the right; flip to the left near the far edge. */
const LABEL_FLIP_GOOD = 7

export function GhostPoints({
  groups,
  variant = 1,
}: {
  groups: PositionGroup[]
  variant?: 1 | 2
}) {
  const variantClass = variant === 2 ? 'ghost-point--2' : 'ghost-point--1'
  return (
    <>
      {groups.map((group) => {
        const left = scoreToPlotPercent(group.good, 'x')
        const top = scoreToPlotPercent(group.fun, 'y')
        const labelOnLeft = group.good > LABEL_FLIP_GOOD

        return (
          <div
            key={`ghost-${variant}-${group.key}`}
            className={[
              'movie-point',
              'ghost-point',
              variantClass,
              labelOnLeft ? 'ghost-point--label-start' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className="movie-label">
              {group.items.map((item) => (
                <span key={item.id} className="movie-label-line">
                  <span className="movie-label-title">{item.title}</span>
                </span>
              ))}
            </span>
          </div>
        )
      })}
    </>
  )
}

import { scoreToPlotPercent } from '../../lib/gridCanvas'
import type { PositionGroup } from '../../lib/groupByPosition'

/** Ghost titles sit on the right; flip to the left near the far edge. */
const LABEL_FLIP_GOOD = 7
/** Matches MoviePoints: primary titles sit on the right below this Good score. */
const PRIMARY_LABEL_FLIP_GOOD = 5
/** Opposite-side coincident titles clip off the square at Good 0 / Good 10. */
const EDGE_GOOD_LOW = 1
const EDGE_GOOD_HIGH = 9
/** When staying on the primary's side, sit toward Fun 0 in the upper half. */
const OFFSET_SOUTH_FUN = 5

export function GhostPoints({
  groups,
  variant = 1,
  primaryKeys,
  raisedPrimaryKeys,
}: {
  groups: PositionGroup[]
  variant?: 1 | 2
  primaryKeys: ReadonlySet<string>
  raisedPrimaryKeys: ReadonlySet<string>
}) {
  const variantClass = variant === 2 ? 'ghost-point--2' : 'ghost-point--1'
  return (
    <>
      {groups.map((group) => {
        const left = scoreToPlotPercent(group.good, 'x')
        const top = scoreToPlotPercent(group.fun, 'y')
        const coincident = primaryKeys.has(group.key)
        const underSelected = raisedPrimaryKeys.has(group.key)
        // Same-score overlay titles share a side at Good < 5 and Good > 7.
        // Put them on the other side of the primary so both names read,
        // except at Good 0 / Good 10 where that other side is off-canvas.
        let labelOnLeft = group.good > LABEL_FLIP_GOOD
        let labelBelow = false
        let labelAbove = false
        if (coincident) {
          const primaryOnRight = group.good < PRIMARY_LABEL_FLIP_GOOD
          const oppositeWouldClip = primaryOnRight
            ? group.good <= EDGE_GOOD_LOW
            : group.good >= EDGE_GOOD_HIGH
          if (oppositeWouldClip) {
            labelOnLeft = !primaryOnRight
            labelBelow = group.fun >= OFFSET_SOUTH_FUN
            labelAbove = !labelBelow
          } else {
            labelOnLeft = primaryOnRight
          }
        }

        return (
          <div
            key={`ghost-${variant}-${group.key}`}
            className={[
              'movie-point',
              'ghost-point',
              variantClass,
              labelOnLeft ? 'ghost-point--label-start' : '',
              labelBelow ? 'ghost-point--label-south' : '',
              labelAbove ? 'ghost-point--label-north' : '',
              underSelected ? 'ghost-point--under-selected' : '',
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

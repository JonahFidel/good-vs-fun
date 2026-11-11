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

function overlayLabelPlacement({
  good,
  fun,
  variant,
  coincident,
  sharedSlot,
}: {
  good: number
  fun: number
  variant: 1 | 2
  coincident: boolean
  sharedSlot: boolean
}) {
  let labelOnLeft = good > LABEL_FLIP_GOOD
  let labelBelow = false
  let labelAbove = false
  let labelFarBelow = false
  let labelFarAbove = false
  const towardSouth = fun >= OFFSET_SOUTH_FUN
  const staggerSecond = sharedSlot && variant === 2

  if (!coincident) {
    // Two overlays at this score with no primary still share the
    // default overlay side. Put the second on the other side, or
    // north/south of the first when that other side is off-canvas.
    if (staggerSecond) {
      const defaultOnRight = !labelOnLeft
      const oppositeWouldClip = defaultOnRight
        ? good <= EDGE_GOOD_LOW
        : good >= EDGE_GOOD_HIGH
      if (oppositeWouldClip) {
        labelBelow = towardSouth
        labelAbove = !towardSouth
      } else {
        labelOnLeft = defaultOnRight
      }
    }
    return { labelOnLeft, labelBelow, labelAbove, labelFarBelow, labelFarAbove }
  }

  const primaryOnRight = good < PRIMARY_LABEL_FLIP_GOOD
  const oppositeWouldClip = primaryOnRight
    ? good <= EDGE_GOOD_LOW
    : good >= EDGE_GOOD_HIGH

  if (oppositeWouldClip) {
    labelOnLeft = !primaryOnRight
    if (staggerSecond) {
      labelFarBelow = towardSouth
      labelFarAbove = !towardSouth
    } else {
      labelBelow = towardSouth
      labelAbove = !towardSouth
    }
  } else {
    labelOnLeft = primaryOnRight
    if (staggerSecond) {
      labelBelow = towardSouth
      labelAbove = !towardSouth
    }
  }

  return { labelOnLeft, labelBelow, labelAbove, labelFarBelow, labelFarAbove }
}

export function GhostPoints({
  groups,
  variant = 1,
  primaryKeys,
  raisedPrimaryKeys,
  siblingKeys,
}: {
  groups: PositionGroup[]
  variant?: 1 | 2
  primaryKeys: ReadonlySet<string>
  raisedPrimaryKeys: ReadonlySet<string>
  siblingKeys: ReadonlySet<string>
}) {
  const variantClass = variant === 2 ? 'ghost-point--2' : 'ghost-point--1'
  return (
    <>
      {groups.map((group) => {
        const left = scoreToPlotPercent(group.good, 'x')
        const top = scoreToPlotPercent(group.fun, 'y')
        const coincident = primaryKeys.has(group.key)
        const underSelected = raisedPrimaryKeys.has(group.key)
        const {
          labelOnLeft,
          labelBelow,
          labelAbove,
          labelFarBelow,
          labelFarAbove,
        } = overlayLabelPlacement({
          good: group.good,
          fun: group.fun,
          variant,
          coincident,
          sharedSlot: siblingKeys.has(group.key),
        })

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
              labelFarBelow ? 'ghost-point--label-south-far' : '',
              labelFarAbove ? 'ghost-point--label-north-far' : '',
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

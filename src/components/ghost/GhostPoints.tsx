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
/** Matches MoviePoints: grow into the Fun 10 gutter at ghost-label zoom. */
const LABEL_SOUTH_FUN = 9
/** Matches MoviePoints: grow into the Fun 0 gutter at ghost-label zoom. */
const LABEL_NORTH_FUN = 1
/** Matches MoviePoints: grow into the Good 10 gutter at ghost-label zoom. */
const LABEL_GUTTER_GOOD_HIGH = 9
/** Matches MoviePoints: grow into the Good 0 gutter at ghost-label zoom. */
const LABEL_GUTTER_GOOD_LOW = 1
/**
 * Matches MoviePoints: centered 7-line pills extend ±0.5 Fun units, so
 * same-Good neighbors closer than one unit cover each other. Pair them
 * with stagger classes instead of Fun 9-10 / Fun 0-1 gutter flags, which
 * are for the namesake edges. Coincident north/south keep their slot.
 */
const INTERIOR_SAME_GOOD_FUN_GAP = 1
/**
 * Matches MoviePoints: after same-Good vertical stagger, the nearest
 * close-Good neighbor still covers the pair on the default overlay
 * side (Grizzly Man at 8.32 vs The Death of Stalin at 8.44). One
 * neighbor per pair, on the Good side away from the pair. Skip
 * coincident north/south so those names do not restack on the
 * primary. Reuse of label-start would also move every left-side
 * overlay.
 */
const INTERIOR_CLOSE_GOOD_GAP = 1

function isInteriorUnstacked(group: PositionGroup): boolean {
  return (
    group.items.length === 1 &&
    group.fun > LABEL_NORTH_FUN &&
    group.fun < LABEL_SOUTH_FUN &&
    group.good > LABEL_GUTTER_GOOD_LOW &&
    group.good < LABEL_GUTTER_GOOD_HIGH
  )
}

function interiorSameGoodVerticalStagger(
  groups: PositionGroup[],
): Map<string, 'fun-10' | 'fun-0'> {
  const stagger = new Map<string, 'fun-10' | 'fun-0'>()
  const interiorUnstacked = groups.filter(isInteriorUnstacked)
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

function interiorCloseGoodHorizontalStagger(
  groups: PositionGroup[],
  verticalStagger: Map<string, 'fun-10' | 'fun-0'>,
): Map<string, 'good-10' | 'good-0'> {
  const stagger = new Map<string, 'good-10' | 'good-0'>()
  if (verticalStagger.size === 0) return stagger

  const interiorUnstacked = groups.filter(isInteriorUnstacked)
  const pairs = new Map<number, PositionGroup[]>()
  for (const group of interiorUnstacked) {
    if (!verticalStagger.has(group.key)) continue
    const list = pairs.get(group.good)
    if (list) list.push(group)
    else pairs.set(group.good, [group])
  }

  for (const pair of pairs.values()) {
    const pairGood = pair[0].good
    let nearest: PositionGroup | null = null
    let nearestDist = Infinity
    for (const candidate of interiorUnstacked) {
      if (verticalStagger.has(candidate.key) || stagger.has(candidate.key)) {
        continue
      }
      for (const member of pair) {
        const dFun = Math.abs(candidate.fun - member.fun)
        const dGood = Math.abs(candidate.good - member.good)
        if (
          dGood === 0 ||
          dGood > INTERIOR_CLOSE_GOOD_GAP ||
          dFun > INTERIOR_SAME_GOOD_FUN_GAP
        ) {
          continue
        }
        const dist = Math.hypot(dFun, dGood)
        if (dist < nearestDist) {
          nearestDist = dist
          nearest = candidate
        }
      }
    }
    if (nearest) {
      stagger.set(nearest.key, nearest.good >= pairGood ? 'good-10' : 'good-0')
    }
  }

  return stagger
}

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
  const verticalStagger = interiorSameGoodVerticalStagger(groups)
  const horizontalStagger = interiorCloseGoodHorizontalStagger(
    groups,
    verticalStagger,
  )
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
        // Coincident north/south already occupies a vertical slot next
        // to the primary. Growing those into the Fun 10 / Fun 0 or
        // Good 10 / Good 0 gutter would restack on the primary that
        // already moved there. Centered overlays at those edges still
        // cover 1-unit neighbors, so only those grow into the gutter.
        const hasVerticalSlot =
          labelBelow || labelAbove || labelFarBelow || labelFarAbove
        const gutterIntoFun10 =
          !hasVerticalSlot && group.fun >= LABEL_SOUTH_FUN
        const gutterIntoFun0 =
          !hasVerticalSlot && !gutterIntoFun10 && group.fun <= LABEL_NORTH_FUN
        const gutterIntoGood10 =
          !hasVerticalSlot && group.good >= LABEL_GUTTER_GOOD_HIGH
        const gutterIntoGood0 =
          !hasVerticalSlot &&
          !gutterIntoGood10 &&
          group.good <= LABEL_GUTTER_GOOD_LOW
        // Interior same-Good stagger reuses the Fun 10 / Fun 0 growth
        // at ghost-label zoom. Close-Good neighbors of that pair flip
        // left/right like label-start so they sit beside the pair
        // instead of covering it. Skip coincident north/south so
        // those names do not restack on the primary that already
        // occupies a slot next to the marker.
        const staggerTowardFun10 =
          !hasVerticalSlot && verticalStagger.get(group.key) === 'fun-10'
        const staggerTowardFun0 =
          !hasVerticalSlot && verticalStagger.get(group.key) === 'fun-0'
        const staggerTowardGood10 =
          !hasVerticalSlot && horizontalStagger.get(group.key) === 'good-10'
        const staggerTowardGood0 =
          !hasVerticalSlot && horizontalStagger.get(group.key) === 'good-0'

        return (
          <div
            key={`ghost-${variant}-${group.key}`}
            className={[
              'movie-point',
              'ghost-point',
              variantClass,
              group.items.length > 1 ? 'ghost-point--stacked' : '',
              labelOnLeft ? 'ghost-point--label-start' : '',
              labelBelow ? 'ghost-point--label-south' : '',
              labelAbove ? 'ghost-point--label-north' : '',
              labelFarBelow ? 'ghost-point--label-south-far' : '',
              labelFarAbove ? 'ghost-point--label-north-far' : '',
              gutterIntoFun10 ? 'ghost-point--gutter-fun-10' : '',
              gutterIntoFun0 ? 'ghost-point--gutter-fun-0' : '',
              gutterIntoGood10 ? 'ghost-point--gutter-good-10' : '',
              gutterIntoGood0 ? 'ghost-point--gutter-good-0' : '',
              staggerTowardFun10 ? 'ghost-point--stagger-fun-10' : '',
              staggerTowardFun0 ? 'ghost-point--stagger-fun-0' : '',
              staggerTowardGood10 ? 'ghost-point--stagger-good-10' : '',
              staggerTowardGood0 ? 'ghost-point--stagger-good-0' : '',
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

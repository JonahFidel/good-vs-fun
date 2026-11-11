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
 * neighbor per pair, on the Good side away from the pair. Isolated
 * close-Good pairs that are not next to a same-Good pair
 * (Frankenstein vs Back to the Future 3, Ad Astra vs Sicario) get
 * the same left/right flip: one title, the side away from its
 * partner. Remaining degree-1 ends of longer close-Good chains
 * (28 Years Later / Alexander / Bone Temple / Pizza) get that
 * flip next, so the two-partner interiors do not block the ends.
 * Independent same-side collisions after those flips (Lebowski
 * vs Palm Springs both Good 10, Moana vs On the Basis of Sex
 * both Good 0) then split vertically so they do not keep
 * covering on that side. Remaining 4-cliques with no degree-1
 * end (Brokeback / Marriage Story / Room / Nomadland) then take
 * the four Fun-plus-Good quadrants around the cluster centroid
 * so those interiors do not keep covering. Skip coincident
 * north/south so those names do not restack on the primary.
 * Reuse of label-start would also move every left-side overlay.
 */
const INTERIOR_CLOSE_GOOD_GAP = 1
/** A 4-clique can occupy the four Fun-plus-Good stagger slots. */
const INTERIOR_CLIQUE_SIZE = 4

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

function closeGoodAwayFromPartner(
  a: PositionGroup,
  b: PositionGroup,
): { key: string; side: 'good-10' | 'good-0' } | null {
  const [higherGood, lowerGood] =
    a.good >= b.good ? [a, b] : [b, a]
  const higherOnRight = higherGood.good < LABEL_FLIP_GOOD
  const lowerOnRight = lowerGood.good < LABEL_FLIP_GOOD
  // Already on opposite default overlay sides, so a flip would
  // grow them toward each other across the Good 7 boundary.
  if (higherOnRight !== lowerOnRight) return null
  if (higherOnRight) {
    return { key: lowerGood.key, side: 'good-0' }
  }
  return { key: higherGood.key, side: 'good-10' }
}

function closeGoodPartners(
  candidates: PositionGroup[],
): Map<string, PositionGroup[]> {
  const partners = new Map<string, PositionGroup[]>()
  for (const group of candidates) {
    partners.set(group.key, [])
  }
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]
      const b = candidates[j]
      const dFun = Math.abs(a.fun - b.fun)
      const dGood = Math.abs(a.good - b.good)
      if (
        dGood === 0 ||
        dGood > INTERIOR_CLOSE_GOOD_GAP ||
        dFun > INTERIOR_SAME_GOOD_FUN_GAP
      ) {
        continue
      }
      partners.get(a.key)!.push(b)
      partners.get(b.key)!.push(a)
    }
  }
  return partners
}

function applyCloseGoodEndFlips(
  candidates: PositionGroup[],
  partners: Map<string, PositionGroup[]>,
  requireBothDegreeOne: boolean,
): Map<string, 'good-10' | 'good-0'> {
  const stagger = new Map<string, 'good-10' | 'good-0'>()
  const used = new Set<string>()
  for (const group of candidates) {
    if (used.has(group.key)) continue
    const list = partners.get(group.key) ?? []
    if (list.length !== 1) continue
    const other = list[0]
    if (used.has(other.key)) continue
    if (
      requireBothDegreeOne &&
      (partners.get(other.key) ?? []).length !== 1
    ) {
      continue
    }

    const flip = closeGoodAwayFromPartner(group, other)
    if (flip) stagger.set(flip.key, flip.side)
    used.add(group.key)
    used.add(other.key)
  }
  return stagger
}

/**
 * Matches MoviePoints: close-Good pairs with no same-Good neighbor
 * still cover each other on the default overlay side. Pair movies
 * that have exactly one such partner among remaining interior
 * titles, then flip the title that sits toward its partner. Skip
 * pairs already on opposite Good sides (overlay flip is 7, not the
 * primary 5), and skip anyone already in same-Good or neighbor
 * stagger so this does not restack Stalin or swallow the 28 Years
 * Later chain. Coincident north/south stay put at class apply.
 */
function interiorIsolatedCloseGoodHorizontalStagger(
  groups: PositionGroup[],
  verticalStagger: Map<string, 'fun-10' | 'fun-0'>,
  neighborStagger: Map<string, 'good-10' | 'good-0'>,
): Map<string, 'good-10' | 'good-0'> {
  const candidates = groups.filter(
    (group) =>
      isInteriorUnstacked(group) &&
      !verticalStagger.has(group.key) &&
      !neighborStagger.has(group.key),
  )
  return applyCloseGoodEndFlips(
    candidates,
    closeGoodPartners(candidates),
    true,
  )
}

/**
 * Isolated pairs leave longer close-Good chains unstaggered because
 * interiors have two partners. Peel remaining degree-1 ends with the
 * same away-from-partner flip so Alexander (toward 28 Years Later)
 * and Pizza Movie (toward Bone Temple) sit on the opposite Good side
 * instead of covering the chain. Odd-length leftovers stay put.
 * Coincident north/south stay put at class apply.
 */
function interiorCloseGoodChainHorizontalStagger(
  groups: PositionGroup[],
  verticalStagger: Map<string, 'fun-10' | 'fun-0'>,
  claimedHorizontal: Map<string, 'good-10' | 'good-0'>,
): Map<string, 'good-10' | 'good-0'> {
  const candidates = groups.filter(
    (group) =>
      isInteriorUnstacked(group) &&
      !verticalStagger.has(group.key) &&
      !claimedHorizontal.has(group.key),
  )
  return applyCloseGoodEndFlips(
    candidates,
    closeGoodPartners(candidates),
    false,
  )
}

/**
 * Neighbor, isolated, and chain flips can land two titles on the
 * same Good side still close enough to cover: Palm Springs
 * (neighbor Good 10) vs Lebowski (isolated Good 10), and Moana
 * vs On the Basis of Sex (both chain-end Good 0). Pair remaining
 * degree-1 same-side neighbors and grow them toward opposite Fun
 * gutters. Skip anyone already in same-Good vertical stagger, and
 * skip clusters with two leftover partners so this does not fight
 * the Drama 4-clique, which gets Fun-plus-Good quadrants next.
 * Coincident north/south stay put at class apply.
 */
function interiorSameSideCloseGoodVerticalStagger(
  groups: PositionGroup[],
  verticalStagger: Map<string, 'fun-10' | 'fun-0'>,
  horizontalStagger: Map<string, 'good-10' | 'good-0'>,
): Map<string, 'fun-10' | 'fun-0'> {
  const stagger = new Map<string, 'fun-10' | 'fun-0'>()
  const bySide = new Map<'good-10' | 'good-0', PositionGroup[]>()
  for (const group of groups) {
    if (
      !isInteriorUnstacked(group) ||
      verticalStagger.has(group.key)
    ) {
      continue
    }
    const side = horizontalStagger.get(group.key)
    if (!side) continue
    const list = bySide.get(side)
    if (list) list.push(group)
    else bySide.set(side, [group])
  }
  for (const list of bySide.values()) {
    const partners = closeGoodPartners(list)
    const used = new Set<string>()
    for (const group of list) {
      if (used.has(group.key)) continue
      const others = partners.get(group.key) ?? []
      if (others.length !== 1) continue
      const other = others[0]
      if (used.has(other.key)) continue
      if ((partners.get(other.key) ?? []).length !== 1) continue
      const [higher, lower] =
        group.fun >= other.fun ? [group, other] : [other, group]
      stagger.set(higher.key, 'fun-10')
      stagger.set(lower.key, 'fun-0')
      used.add(group.key)
      used.add(other.key)
    }
  }
  return stagger
}

function closeGoodConnectedComponents(
  candidates: PositionGroup[],
): PositionGroup[][] {
  const partners = closeGoodPartners(candidates)
  const visited = new Set<string>()
  const components: PositionGroup[][] = []
  for (const group of candidates) {
    if (visited.has(group.key)) continue
    const stack = [group]
    const component: PositionGroup[] = []
    visited.add(group.key)
    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) break
      component.push(current)
      for (const partner of partners.get(current.key) ?? []) {
        if (visited.has(partner.key)) continue
        visited.add(partner.key)
        stack.push(partner)
      }
    }
    components.push(component)
  }
  return components
}

/**
 * Matches MoviePoints: clique interiors never received a
 * horizontal class, so isolated pairs, chain peels, and
 * same-side Fun stagger all skip them. A remaining 4-clique
 * (Brokeback / Marriage Story / Room / Nomadland) can occupy
 * the four Fun-plus-Good slots the combo CSS already paints.
 * Assign each title the quadrant of its marker relative to
 * the cluster centroid, and skip the cluster if that split
 * is not unique so a line-shaped 4 does not stack two titles
 * in one slot. Size-3 triangles and Jonah's 2025 9-mesh stay
 * put: four slots cannot unique-pack those. Coincident
 * north/south stay put at class apply.
 */
function interiorCloseGoodCliqueQuadrantStagger(
  groups: PositionGroup[],
  verticalStagger: Map<string, 'fun-10' | 'fun-0'>,
  horizontalStagger: Map<string, 'good-10' | 'good-0'>,
  sameSideVertical: Map<string, 'fun-10' | 'fun-0'>,
): {
  fun: Map<string, 'fun-10' | 'fun-0'>
  good: Map<string, 'good-10' | 'good-0'>
} {
  const fun = new Map<string, 'fun-10' | 'fun-0'>()
  const good = new Map<string, 'good-10' | 'good-0'>()
  const candidates = groups.filter(
    (group) =>
      isInteriorUnstacked(group) &&
      !verticalStagger.has(group.key) &&
      !horizontalStagger.has(group.key) &&
      !sameSideVertical.has(group.key),
  )
  for (const component of closeGoodConnectedComponents(candidates)) {
    if (component.length !== INTERIOR_CLIQUE_SIZE) continue
    const centroidFun =
      component.reduce((sum, group) => sum + group.fun, 0) / component.length
    const centroidGood =
      component.reduce((sum, group) => sum + group.good, 0) / component.length
    const assigned: {
      key: string
      fun: 'fun-10' | 'fun-0'
      good: 'good-10' | 'good-0'
    }[] = []
    const quadrants = new Set<string>()
    for (const group of component) {
      const funSide = group.fun >= centroidFun ? 'fun-10' : 'fun-0'
      const goodSide = group.good >= centroidGood ? 'good-10' : 'good-0'
      assigned.push({ key: group.key, fun: funSide, good: goodSide })
      quadrants.add(`${funSide}:${goodSide}`)
    }
    if (quadrants.size !== INTERIOR_CLIQUE_SIZE) continue
    for (const entry of assigned) {
      fun.set(entry.key, entry.fun)
      good.set(entry.key, entry.good)
    }
  }
  return { fun, good }
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
  const neighborStagger = interiorCloseGoodHorizontalStagger(
    groups,
    verticalStagger,
  )
  const isolatedStagger = interiorIsolatedCloseGoodHorizontalStagger(
    groups,
    verticalStagger,
    neighborStagger,
  )
  const chainStagger = interiorCloseGoodChainHorizontalStagger(
    groups,
    verticalStagger,
    new Map([...neighborStagger, ...isolatedStagger]),
  )
  const horizontalStagger = new Map([
    ...neighborStagger,
    ...isolatedStagger,
    ...chainStagger,
  ])
  const sameSideVertical = interiorSameSideCloseGoodVerticalStagger(
    groups,
    verticalStagger,
    horizontalStagger,
  )
  const cliqueStagger = interiorCloseGoodCliqueQuadrantStagger(
    groups,
    verticalStagger,
    horizontalStagger,
    sameSideVertical,
  )
  const funStagger = new Map([
    ...verticalStagger,
    ...sameSideVertical,
    ...cliqueStagger.fun,
  ])
  const goodStagger = new Map([...horizontalStagger, ...cliqueStagger.good])
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
        // at ghost-label zoom. Close-Good neighbors of that pair,
        // isolated close-Good pairs with no same-Good neighbor, and
        // remaining degree-1 ends of longer close-Good chains flip
        // left/right like label-start so they sit beside each other
        // instead of covering. Independent same-side collisions after
        // those flips (Lebowski vs Palm Springs, Moana vs On the
        // Basis of Sex) add Fun stagger on top of that Good class.
        // Remaining 4-cliques (Brokeback / Marriage Story / Room /
        // Nomadland) assign both Fun and Good slots at once.
        // Skip coincident north/south so those names do not restack
        // on the primary that already occupies a slot next to the
        // marker.
        const staggerTowardFun10 =
          !hasVerticalSlot && funStagger.get(group.key) === 'fun-10'
        const staggerTowardFun0 =
          !hasVerticalSlot && funStagger.get(group.key) === 'fun-0'
        const staggerTowardGood10 =
          !hasVerticalSlot && goodStagger.get(group.key) === 'good-10'
        const staggerTowardGood0 =
          !hasVerticalSlot && goodStagger.get(group.key) === 'good-0'

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

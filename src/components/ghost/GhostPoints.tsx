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
 * so those interiors do not keep covering. Size-3 triangles
 * that fail that unique-quadrant pack (Naked Gun / Naked Gun
 * old / One of Them Days) then take a 2-vs-1 split of those
 * same slots. Size-5+ meshes that fail both guards (Jonah's
 * 2025 9-mesh around Knives Out 3) then peel the hub so a
 * leftover unique-quadrant 4 can occupy those slots.
 * Leftover mesh of that peel then packs a triangle: overlay
 * chain stagger leaves Some Like It Hot / John Wick /
 * Inside the Mind of a Dog in the cluster, so the leftover
 * is size-8 rather than the primary's size-5, but peeling
 * Knives Out 3 still frees The Vvitch / The Killer.
 * Remaining size-5 of that peel then peels the vertex
 * whose removal leaves a unique-quadrant 4, so John Wick,
 * Some Like It Hot, Challengers, and Logan Lucky occupy
 * opposite corners. Interior Fun-plus-Good slots that
 * grow into the Good 10 / Good 0 gutter still cover a
 * gutter title in that same slot (Mickey 17 at Fun 0 /
 * Good 10 vs Stand by Me), so those gutter neighbors
 * then take Fun stagger: higher Fun grows toward Fun 10,
 * lower toward Fun 0. Fun 0-1 / Fun 9-10 gutter titles
 * next to those same slots (Manchester by the Sea at
 * Fun 1 / Good 9.1 beside Room at Fun 0 / Good 10)
 * then take Good stagger opposite the interior so they
 * split horizontally instead of covering in the Fun
 * gutter. Isolated Fun-gutter close-Good pairs that
 * are not next to those interiors (Airplane vs
 * Ghostbusters, Inglorious Basterds vs Pirates) then
 * take that same left/right flip at ghost-label zoom.
 * Remaining degree-1 ends of Fun-gutter 3-chains
 * (Top Gun / Die Hard / Kill Bill) get that flip
 * next, so the two-partner middle does not block
 * the ends. Overlay flip 7 already puts Kill Bill
 * on the right of Die Hard, so the leftover peel
 * only needs Top Gun on Good 10. Drama's leftover
 * Fun 0-1 triangle (12 Years / Schindler /
 * Requiem after Tree of Life sits opposite) takes
 * Fun stagger on the primary; overlay copies wait
 * for ghost-label zoom. Skip coincident
 * north/south so those names do not restack on
 * the primary. Reuse of label-start would also
 * move every left-side overlay.
 */
const INTERIOR_CLOSE_GOOD_GAP = 1
/** A 4-clique can occupy the four Fun-plus-Good stagger slots. */
const INTERIOR_CLIQUE_SIZE = 4
/** A triangle occupies three of those slots as a 2-vs-1 split. */
const INTERIOR_TRIANGLE_SIZE = 3
/**
 * Leftover mesh after a unique-quadrant-4 peel is at least a
 * size-5 bowtie. Overlay leftovers can be larger.
 */
const INTERIOR_LEFTOVER_MESH_SIZE = 5

function isInteriorUnstacked(group: PositionGroup): boolean {
  return (
    group.items.length === 1 &&
    group.fun > LABEL_NORTH_FUN &&
    group.fun < LABEL_SOUTH_FUN &&
    group.good > LABEL_GUTTER_GOOD_LOW &&
    group.good < LABEL_GUTTER_GOOD_HIGH
  )
}

function isGoodGutterUnstacked(group: PositionGroup): boolean {
  return (
    group.items.length === 1 &&
    group.fun > LABEL_NORTH_FUN &&
    group.fun < LABEL_SOUTH_FUN &&
    (group.good >= LABEL_GUTTER_GOOD_HIGH ||
      group.good <= LABEL_GUTTER_GOOD_LOW)
  )
}

function isFunGutterUnstacked(group: PositionGroup): boolean {
  return (
    group.items.length === 1 &&
    (group.fun >= LABEL_SOUTH_FUN || group.fun <= LABEL_NORTH_FUN)
  )
}

function funGutterResolvedGoodSide(group: PositionGroup): 'left' | 'right' {
  if (group.good >= LABEL_GUTTER_GOOD_HIGH) return 'right'
  if (group.good <= LABEL_GUTTER_GOOD_LOW) return 'left'
  return group.good > LABEL_FLIP_GOOD ? 'left' : 'right'
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
 * in one slot. Size-3 triangles get a 2-vs-1 split next;
 * size-5+ meshes peel a hub after that so a leftover
 * unique-quadrant 4 can still pack. Leftover mesh of that
 * peel packs a triangle after that. Coincident north/south
 * stay put at class apply.
 */
function uniqueQuadrantAssignment(
  component: PositionGroup[],
): {
  key: string
  fun: 'fun-10' | 'fun-0'
  good: 'good-10' | 'good-0'
}[] | null {
  if (component.length !== INTERIOR_CLIQUE_SIZE) return null
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
    const funSide: 'fun-10' | 'fun-0' =
      group.fun >= centroidFun ? 'fun-10' : 'fun-0'
    const goodSide: 'good-10' | 'good-0' =
      group.good >= centroidGood ? 'good-10' : 'good-0'
    assigned.push({ key: group.key, fun: funSide, good: goodSide })
    quadrants.add(`${funSide}:${goodSide}`)
  }
  if (quadrants.size !== INTERIOR_CLIQUE_SIZE) return null
  return assigned
}

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
    const assigned = uniqueQuadrantAssignment(component)
    if (!assigned) continue
    for (const entry of assigned) {
      fun.set(entry.key, entry.fun)
      good.set(entry.key, entry.good)
    }
  }
  return { fun, good }
}

function oppositeFunSide(side: 'fun-10' | 'fun-0'): 'fun-10' | 'fun-0' {
  return side === 'fun-10' ? 'fun-0' : 'fun-10'
}

function oppositeGoodSide(side: 'good-10' | 'good-0'): 'good-10' | 'good-0' {
  return side === 'good-10' ? 'good-0' : 'good-10'
}

function pickTowardShared<T>(
  first: T,
  second: T,
  score: (entry: T) => number,
  towardHigh: boolean,
): T {
  const firstScore = score(first)
  const secondScore = score(second)
  if (towardHigh) return firstScore >= secondScore ? first : second
  return firstScore <= secondScore ? first : second
}

/**
 * Matches MoviePoints: size-3 triangles fail the 4-clique
 * unique-quadrant pack. Naked Gun and Naked Gun old both land
 * Fun 10 / Good 10 around the cluster centroid, while One of
 * Them Days is uniquely Fun 0 / Good 0. Keep the singleton in
 * its centroid slot, keep the pair member that already sits
 * toward the shared slot, and move the other into the unused
 * adjacent quadrant along the pair's larger separation (Fun
 * for those two Naked Guns). Leftover mesh of the 9-mesh peel
 * reuses this next so Knives Out 3 / The Vvitch / The Killer
 * can occupy three slots. Coincident north/south stay put at
 * class apply.
 */
function triangleAssignment(
  component: PositionGroup[],
): {
  key: string
  fun: 'fun-10' | 'fun-0'
  good: 'good-10' | 'good-0'
}[] | null {
  if (component.length !== INTERIOR_TRIANGLE_SIZE) return null
  const centroidFun =
    component.reduce((sum, group) => sum + group.fun, 0) / component.length
  const centroidGood =
    component.reduce((sum, group) => sum + group.good, 0) / component.length
  const assigned: {
    group: PositionGroup
    fun: 'fun-10' | 'fun-0'
    good: 'good-10' | 'good-0'
  }[] = []
  const byQuadrant = new Map<
    string,
    {
      group: PositionGroup
      fun: 'fun-10' | 'fun-0'
      good: 'good-10' | 'good-0'
    }[]
  >()
  for (const group of component) {
    const funSide: 'fun-10' | 'fun-0' =
      group.fun >= centroidFun ? 'fun-10' : 'fun-0'
    const goodSide: 'good-10' | 'good-0' =
      group.good >= centroidGood ? 'good-10' : 'good-0'
    const entry = { group, fun: funSide, good: goodSide }
    assigned.push(entry)
    const key = `${funSide}:${goodSide}`
    const list = byQuadrant.get(key)
    if (list) list.push(entry)
    else byQuadrant.set(key, [entry])
  }
  if (byQuadrant.size === INTERIOR_TRIANGLE_SIZE) {
    return assigned.map((entry) => ({
      key: entry.group.key,
      fun: entry.fun,
      good: entry.good,
    }))
  }
  if (byQuadrant.size !== 2) return null
  const pair = [...byQuadrant.values()].find((list) => list.length === 2)
  const singletonList = [...byQuadrant.values()].find(
    (list) => list.length === 1,
  )
  if (!pair || !singletonList) return null
  const singleton = singletonList[0]
  const [first, second] = pair
  const sharedFun = first.fun
  const sharedGood = first.good
  const uniqueKey = `${singleton.fun}:${singleton.good}`
  const funFlip = {
    fun: oppositeFunSide(sharedFun),
    good: sharedGood,
  }
  const goodFlip = {
    fun: sharedFun,
    good: oppositeGoodSide(sharedGood),
  }
  const funFlipKey = `${funFlip.fun}:${funFlip.good}`
  const dFun = Math.abs(first.group.fun - second.group.fun)
  const dGood = Math.abs(first.group.good - second.group.good)
  let splitOnFun = dFun >= dGood
  if (splitOnFun && funFlipKey === uniqueKey) splitOnFun = false
  if (!splitOnFun && `${goodFlip.fun}:${goodFlip.good}` === uniqueKey) {
    splitOnFun = true
  }
  const keep = pickTowardShared(
    first,
    second,
    splitOnFun
      ? (entry) => entry.group.fun
      : (entry) => entry.group.good,
    splitOnFun ? sharedFun === 'fun-10' : sharedGood === 'good-10',
  )
  const move = keep === first ? second : first
  const moveSlot = splitOnFun ? funFlip : goodFlip
  return [
    {
      key: singleton.group.key,
      fun: singleton.fun,
      good: singleton.good,
    },
    {
      key: keep.group.key,
      fun: sharedFun,
      good: sharedGood,
    },
    {
      key: move.group.key,
      fun: moveSlot.fun,
      good: moveSlot.good,
    },
  ]
}

function interiorCloseGoodTriangleStagger(
  groups: PositionGroup[],
  verticalStagger: Map<string, 'fun-10' | 'fun-0'>,
  horizontalStagger: Map<string, 'good-10' | 'good-0'>,
  sameSideVertical: Map<string, 'fun-10' | 'fun-0'>,
  cliqueFun: Map<string, 'fun-10' | 'fun-0'>,
  cliqueGood: Map<string, 'good-10' | 'good-0'>,
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
      !sameSideVertical.has(group.key) &&
      !cliqueFun.has(group.key) &&
      !cliqueGood.has(group.key),
  )
  for (const component of closeGoodConnectedComponents(candidates)) {
    const assigned = triangleAssignment(component)
    if (!assigned) continue
    for (const entry of assigned) {
      fun.set(entry.key, entry.fun)
      good.set(entry.key, entry.good)
    }
  }
  return { fun, good }
}

/**
 * Matches MoviePoints: size-5+ leftover meshes fail clique
 * and triangle guards. Jonah's 2025 9-mesh around Knives
 * Out 3 puts four titles in one centroid quadrant. Peel
 * the highest-degree hub whose removal leaves a unique-
 * quadrant 4 (Knives Out 3) so Sinners, Clerks, One
 * Battle After Another, and Mickey 17 occupy opposite
 * Fun-plus-Good corners of that subcluster. Size-2
 * leftovers of that peel stay put so this does not
 * restack Challengers on a leftover isolated-pair flip.
 * Leftover mesh of that peel packs a triangle next.
 * Coincident north/south stay put at class apply.
 */
function interiorCloseGoodMeshHubStagger(
  groups: PositionGroup[],
  verticalStagger: Map<string, 'fun-10' | 'fun-0'>,
  horizontalStagger: Map<string, 'good-10' | 'good-0'>,
  sameSideVertical: Map<string, 'fun-10' | 'fun-0'>,
  cliqueFun: Map<string, 'fun-10' | 'fun-0'>,
  cliqueGood: Map<string, 'good-10' | 'good-0'>,
  triangleFun: Map<string, 'fun-10' | 'fun-0'>,
  triangleGood: Map<string, 'good-10' | 'good-0'>,
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
      !sameSideVertical.has(group.key) &&
      !cliqueFun.has(group.key) &&
      !cliqueGood.has(group.key) &&
      !triangleFun.has(group.key) &&
      !triangleGood.has(group.key),
  )
  for (const component of closeGoodConnectedComponents(candidates)) {
    if (component.length <= INTERIOR_CLIQUE_SIZE) continue
    const partners = closeGoodPartners(component)
    const hubs = [...component].sort(
      (a, b) =>
        (partners.get(b.key)?.length ?? 0) -
        (partners.get(a.key)?.length ?? 0),
    )
    let packed = false
    for (const hub of hubs) {
      if (packed) break
      const remaining = component.filter((group) => group.key !== hub.key)
      for (const piece of closeGoodConnectedComponents(remaining)) {
        const assigned = uniqueQuadrantAssignment(piece)
        if (!assigned) continue
        for (const entry of assigned) {
          fun.set(entry.key, entry.fun)
          good.set(entry.key, entry.good)
        }
        packed = true
      }
    }
  }
  return { fun, good }
}

/**
 * Isolated Good flip of Challengers vs Logan Lucky would
 * restack Challengers on an already-staggered Good-10 title
 * when that pair is a leftover size-2. Skip a leftover pair
 * when that flip lands on the same Good side as a nearby
 * already-staggered title.
 */
function isolatedCloseGoodFlipRestacks(
  pair: PositionGroup[],
  assignedGood: Map<string, 'good-10' | 'good-0'>,
  groups: PositionGroup[],
): boolean {
  if (pair.length !== 2) return false
  const flip = closeGoodAwayFromPartner(pair[0], pair[1])
  if (!flip) return false
  const flipped = pair[0].key === flip.key ? pair[0] : pair[1]
  for (const other of groups) {
    if (other.key === pair[0].key || other.key === pair[1].key) continue
    if (assignedGood.get(other.key) !== flip.side) continue
    const dFun = Math.abs(flipped.fun - other.fun)
    const dGood = Math.abs(flipped.good - other.good)
    if (
      dGood === 0 ||
      dGood > INTERIOR_CLOSE_GOOD_GAP ||
      dFun > INTERIOR_SAME_GOOD_FUN_GAP
    ) {
      continue
    }
    return true
  }
  return false
}

/**
 * Matches MoviePoints: leftover mesh after a unique-quadrant-4
 * hub peel fails unique-4 and triangle guards. Overlay chain
 * stagger does not claim Some Like It Hot / John Wick /
 * Inside the Mind of a Dog, so the leftover is size-8 rather
 * than the primary's size-5. Peel the hub (Knives Out 3) and
 * pack it with the size-2 whose isolated Good flip would not
 * restack (The Vvitch / The Killer) so those three occupy
 * triangle slots. The remaining size-5 Challengers cluster
 * peels a unique-quadrant-4 vertex next. Allow leftover
 * meshes larger than 5 so this is not a no-op on overlay.
 * Coincident north/south stay put at class apply.
 */
function interiorCloseGoodLeftoverMeshTriangleStagger(
  groups: PositionGroup[],
  verticalStagger: Map<string, 'fun-10' | 'fun-0'>,
  horizontalStagger: Map<string, 'good-10' | 'good-0'>,
  sameSideVertical: Map<string, 'fun-10' | 'fun-0'>,
  cliqueFun: Map<string, 'fun-10' | 'fun-0'>,
  cliqueGood: Map<string, 'good-10' | 'good-0'>,
  triangleFun: Map<string, 'fun-10' | 'fun-0'>,
  triangleGood: Map<string, 'good-10' | 'good-0'>,
  meshFun: Map<string, 'fun-10' | 'fun-0'>,
  meshGood: Map<string, 'good-10' | 'good-0'>,
): {
  fun: Map<string, 'fun-10' | 'fun-0'>
  good: Map<string, 'good-10' | 'good-0'>
} {
  const fun = new Map<string, 'fun-10' | 'fun-0'>()
  const good = new Map<string, 'good-10' | 'good-0'>()
  const assignedGood = new Map([
    ...horizontalStagger,
    ...cliqueGood,
    ...triangleGood,
    ...meshGood,
  ])
  const candidates = groups.filter(
    (group) =>
      isInteriorUnstacked(group) &&
      !verticalStagger.has(group.key) &&
      !horizontalStagger.has(group.key) &&
      !sameSideVertical.has(group.key) &&
      !cliqueFun.has(group.key) &&
      !cliqueGood.has(group.key) &&
      !triangleFun.has(group.key) &&
      !triangleGood.has(group.key) &&
      !meshFun.has(group.key) &&
      !meshGood.has(group.key),
  )
  for (const component of closeGoodConnectedComponents(candidates)) {
    if (component.length < INTERIOR_LEFTOVER_MESH_SIZE) continue
    const partners = closeGoodPartners(component)
    const hub = [...component].sort(
      (a, b) =>
        (partners.get(b.key)?.length ?? 0) -
        (partners.get(a.key)?.length ?? 0),
    )[0]
    if (!hub) continue
    const remaining = component.filter((group) => group.key !== hub.key)
    let packed = false
    for (const piece of closeGoodConnectedComponents(remaining)) {
      if (packed) break
      if (piece.length !== 2) continue
      if (isolatedCloseGoodFlipRestacks(piece, assignedGood, groups)) {
        continue
      }
      const assigned = triangleAssignment([hub, ...piece])
      if (!assigned) continue
      for (const entry of assigned) {
        fun.set(entry.key, entry.fun)
        good.set(entry.key, entry.good)
      }
      packed = true
    }
  }
  return { fun, good }
}

/**
 * Matches MoviePoints leftover pair Fun stagger, but a
 * naive size===2 port is a no-op: overlay chain stagger
 * leaves Some Like It Hot / John Wick / Inside the Mind
 * of a Dog in the cluster, so leftover after the Knives
 * Out 3 triangle peel is size-5. Peeling both degree-1
 * ends and triangle-packing the left trio would flip
 * Some Like It Hot onto John Wick's default right.
 * Reuse the mesh hub peel on this leftover: drop the
 * vertex whose removal leaves a unique-quadrant 4
 * (Inside the Mind of a Dog) so John Wick grows toward
 * Fun 10 / Good 0, Some Like It Hot toward Fun 10 /
 * Good 10, Challengers toward Fun 0 / Good 10, and
 * Logan Lucky toward Fun 0 / Good 0. Coincident
 * north/south stay put at class apply.
 */
function interiorCloseGoodLeftoverMeshUnique4Stagger(
  groups: PositionGroup[],
  verticalStagger: Map<string, 'fun-10' | 'fun-0'>,
  horizontalStagger: Map<string, 'good-10' | 'good-0'>,
  sameSideVertical: Map<string, 'fun-10' | 'fun-0'>,
  cliqueFun: Map<string, 'fun-10' | 'fun-0'>,
  cliqueGood: Map<string, 'good-10' | 'good-0'>,
  triangleFun: Map<string, 'fun-10' | 'fun-0'>,
  triangleGood: Map<string, 'good-10' | 'good-0'>,
  meshFun: Map<string, 'fun-10' | 'fun-0'>,
  meshGood: Map<string, 'good-10' | 'good-0'>,
  leftoverMeshFun: Map<string, 'fun-10' | 'fun-0'>,
  leftoverMeshGood: Map<string, 'good-10' | 'good-0'>,
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
      !sameSideVertical.has(group.key) &&
      !cliqueFun.has(group.key) &&
      !cliqueGood.has(group.key) &&
      !triangleFun.has(group.key) &&
      !triangleGood.has(group.key) &&
      !meshFun.has(group.key) &&
      !meshGood.has(group.key) &&
      !leftoverMeshFun.has(group.key) &&
      !leftoverMeshGood.has(group.key),
  )
  for (const component of closeGoodConnectedComponents(candidates)) {
    if (component.length < INTERIOR_LEFTOVER_MESH_SIZE) continue
    const partners = closeGoodPartners(component)
    const hubs = [...component].sort(
      (a, b) =>
        (partners.get(b.key)?.length ?? 0) -
        (partners.get(a.key)?.length ?? 0),
    )
    let packed = false
    for (const hub of hubs) {
      if (packed) break
      const remaining = component.filter((group) => group.key !== hub.key)
      for (const piece of closeGoodConnectedComponents(remaining)) {
        const assigned = uniqueQuadrantAssignment(piece)
        if (!assigned) continue
        for (const entry of assigned) {
          fun.set(entry.key, entry.fun)
          good.set(entry.key, entry.good)
        }
        packed = true
      }
    }
  }
  return { fun, good }
}

/**
 * Matches MoviePoints: interior Fun-plus-Good slots that grow
 * into the Good 10 / Good 0 gutter still cover a 1-unit gutter
 * title already parked there: Mickey 17 (7.58 / 8.78, Fun 0 /
 * Good 10) covers Stand by Me (7.13 / 9.19). Pair each gutter
 * title with the nearest interior that already occupies that
 * Good slot and has a Fun class, then grow the gutter title
 * toward Fun 10 if it sits higher or Fun 0 if lower so both
 * seven-line pills fit. Skip Fun 9-10 / Fun 0-1 titles
 * (Manchester by the Sea) so this does not fight edge-gutter
 * CSS, and skip interiors that only have a Good class (Stalin)
 * so Kill Bill V1 stays in the namesake Good 10 gutter.
 * Overlay leftover unique-4 titles (Challengers Fun 0 /
 * Good 10) do not steal those pairs: Challengers is more
 * than one Good from Stand by Me. Fun 0-1 / Fun 9-10
 * titles get a Good-side split next. Coincident
 * north/south stay put at class apply.
 */
function interiorGutterNeighborFunStagger(
  groups: PositionGroup[],
  interiorFun: Map<string, 'fun-10' | 'fun-0'>,
  interiorGood: Map<string, 'good-10' | 'good-0'>,
): Map<string, 'fun-10' | 'fun-0'> {
  const stagger = new Map<string, 'fun-10' | 'fun-0'>()
  const gutters = groups.filter(isGoodGutterUnstacked)
  const interiors = groups.filter(
    (group) =>
      isInteriorUnstacked(group) &&
      interiorFun.has(group.key) &&
      interiorGood.has(group.key),
  )
  const pairs: {
    gutter: PositionGroup
    interior: PositionGroup
    dist: number
  }[] = []
  for (const gutter of gutters) {
    const wantGood: 'good-10' | 'good-0' =
      gutter.good >= LABEL_GUTTER_GOOD_HIGH ? 'good-10' : 'good-0'
    for (const interior of interiors) {
      if (interiorGood.get(interior.key) !== wantGood) continue
      const dFun = Math.abs(gutter.fun - interior.fun)
      const dGood = Math.abs(gutter.good - interior.good)
      if (
        dFun > INTERIOR_SAME_GOOD_FUN_GAP ||
        dGood > INTERIOR_CLOSE_GOOD_GAP
      ) {
        continue
      }
      pairs.push({
        gutter,
        interior,
        dist: Math.hypot(dFun, dGood),
      })
    }
  }
  pairs.sort((a, b) => a.dist - b.dist)
  const usedGutter = new Set<string>()
  const usedInterior = new Set<string>()
  for (const pair of pairs) {
    if (
      usedGutter.has(pair.gutter.key) ||
      usedInterior.has(pair.interior.key)
    ) {
      continue
    }
    const side: 'fun-10' | 'fun-0' =
      pair.gutter.fun >= pair.interior.fun ? 'fun-10' : 'fun-0'
    stagger.set(pair.gutter.key, side)
    usedGutter.add(pair.gutter.key)
    usedInterior.add(pair.interior.key)
  }
  return stagger
}

/**
 * Matches MoviePoints: interior Fun-plus-Good slots that grow
 * into the Fun 10 / Fun 0 gutter still cover a 1-unit Fun-gutter
 * title already parked there: Room (1.8 / 8.9, Fun 0 / Good 10)
 * covers Manchester by the Sea (1.0 / 9.1). Pair each Fun-gutter
 * title with the nearest interior that already occupies that
 * Fun slot and has a Good class, then grow the gutter title
 * to the opposite Good side so both seven-line pills fit.
 * Skip pairs already on opposite Good sides, and skip
 * interiors that only have a Fun class so same-Good
 * vertical stagger does not pull a Fun-gutter title onto
 * Grizzly Man. Overlay leftover unique-4 titles (John Wick
 * Fun 10 / Good 0) can win Furiosa over Clerks because
 * John Wick is closer; Furiosa still flips to Good 10
 * because both interiors occupy Good 0. Coincident
 * north/south stay put at class apply.
 */
function interiorFunGutterNeighborGoodStagger(
  groups: PositionGroup[],
  interiorFun: Map<string, 'fun-10' | 'fun-0'>,
  interiorGood: Map<string, 'good-10' | 'good-0'>,
): Map<string, 'good-10' | 'good-0'> {
  const stagger = new Map<string, 'good-10' | 'good-0'>()
  const gutters = groups.filter(isFunGutterUnstacked)
  const interiors = groups.filter(
    (group) =>
      isInteriorUnstacked(group) &&
      interiorFun.has(group.key) &&
      interiorGood.has(group.key),
  )
  const pairs: {
    gutter: PositionGroup
    interior: PositionGroup
    dist: number
  }[] = []
  for (const gutter of gutters) {
    const wantFun: 'fun-10' | 'fun-0' =
      gutter.fun >= LABEL_SOUTH_FUN ? 'fun-10' : 'fun-0'
    for (const interior of interiors) {
      if (interiorFun.get(interior.key) !== wantFun) continue
      const dFun = Math.abs(gutter.fun - interior.fun)
      const dGood = Math.abs(gutter.good - interior.good)
      if (
        dFun > INTERIOR_SAME_GOOD_FUN_GAP ||
        dGood > INTERIOR_CLOSE_GOOD_GAP
      ) {
        continue
      }
      pairs.push({
        gutter,
        interior,
        dist: Math.hypot(dFun, dGood),
      })
    }
  }
  pairs.sort((a, b) => a.dist - b.dist)
  const usedGutter = new Set<string>()
  const usedInterior = new Set<string>()
  for (const pair of pairs) {
    if (
      usedGutter.has(pair.gutter.key) ||
      usedInterior.has(pair.interior.key)
    ) {
      continue
    }
    const interiorSide = interiorGood.get(pair.interior.key)
    if (!interiorSide) continue
    const interiorResolved: 'left' | 'right' =
      interiorSide === 'good-10' ? 'right' : 'left'
    if (funGutterResolvedGoodSide(pair.gutter) !== interiorResolved) {
      continue
    }
    const side: 'good-10' | 'good-0' =
      interiorResolved === 'right' ? 'good-0' : 'good-10'
    stagger.set(pair.gutter.key, side)
    usedGutter.add(pair.gutter.key)
    usedInterior.add(pair.interior.key)
  }
  return stagger
}

/**
 * Isolated Fun-gutter close-Good pairs still cover each
 * other after the interior-neighbor pass: Airplane
 * (9.9 / 7.5) covers Ghostbusters (9.0 / 7.2) on the
 * overlay left at Good > 7, and Inglorious Basterds
 * (9.0 / 9.02) covers Pirates (9.55 / 9.83) in the
 * namesake Good 10 gutter. Pair movies that have
 * exactly one such partner among remaining Fun-gutter
 * titles, then flip the title that sits toward its
 * partner using the Fun-gutter resolved side (namesake
 * Good 10 is already right, unlike overlay Good > 7).
 * Skip pairs already on opposite sides, skip Fun-gutter
 * titles already claimed by the interior neighbor pass
 * so Furiosa stays opposite John Wick, skip a 3-chain
 * whose middle has two partners (Top Gun / Die Hard /
 * Kill Bill), and skip a flip that would restack on a
 * nearby claimed or same-side Fun-gutter title.
 * Coincident north/south stay put at class apply.
 */
function funGutterIsolatedFlipRestacks(
  flipped: PositionGroup,
  side: 'good-10' | 'good-0',
  pairOther: PositionGroup,
  assignedGood: Map<string, 'good-10' | 'good-0'>,
  groups: PositionGroup[],
): boolean {
  const want: 'left' | 'right' = side === 'good-10' ? 'right' : 'left'
  for (const other of groups) {
    if (other.key === flipped.key || other.key === pairOther.key) continue
    if (other.items.length !== 1) continue
    const assigned = assignedGood.get(other.key)
    const otherSide: 'left' | 'right' | null = assigned
      ? assigned === 'good-10'
        ? 'right'
        : 'left'
      : isFunGutterUnstacked(other)
        ? funGutterResolvedGoodSide(other)
        : null
    if (otherSide !== want) continue
    const dFun = Math.abs(flipped.fun - other.fun)
    const dGood = Math.abs(flipped.good - other.good)
    if (
      dGood === 0 ||
      dGood > INTERIOR_CLOSE_GOOD_GAP ||
      dFun > INTERIOR_SAME_GOOD_FUN_GAP
    ) {
      continue
    }
    return true
  }
  return false
}

function funGutterIsolatedCloseGoodHorizontalStagger(
  groups: PositionGroup[],
  claimedGood: Map<string, 'good-10' | 'good-0'>,
): Map<string, 'good-10' | 'good-0'> {
  const stagger = new Map<string, 'good-10' | 'good-0'>()
  const candidates = groups.filter(
    (group) =>
      isFunGutterUnstacked(group) && !claimedGood.has(group.key),
  )
  const partners = closeGoodPartners(candidates)
  const used = new Set<string>()
  for (const group of candidates) {
    if (used.has(group.key)) continue
    const list = partners.get(group.key) ?? []
    if (list.length !== 1) continue
    const other = list[0]
    if (used.has(other.key)) continue
    if ((partners.get(other.key) ?? []).length !== 1) continue
    const groupSide = funGutterResolvedGoodSide(group)
    const otherSide = funGutterResolvedGoodSide(other)
    if (groupSide !== otherSide) {
      used.add(group.key)
      used.add(other.key)
      continue
    }
    const [higherGood, lowerGood] =
      group.good >= other.good ? [group, other] : [other, group]
    const side: 'good-10' | 'good-0' =
      groupSide === 'left' ? 'good-10' : 'good-0'
    const flipped = groupSide === 'left' ? higherGood : lowerGood
    const pairOther = flipped.key === group.key ? other : group
    if (
      funGutterIsolatedFlipRestacks(
        flipped,
        side,
        pairOther,
        claimedGood,
        groups,
      )
    ) {
      used.add(group.key)
      used.add(other.key)
      continue
    }
    stagger.set(flipped.key, side)
    used.add(group.key)
    used.add(other.key)
  }
  return stagger
}

function funGutterAssignedGoodSide(
  group: PositionGroup,
  assigned: Map<string, 'good-10' | 'good-0'>,
): 'left' | 'right' {
  const side = assigned.get(group.key)
  if (side === 'good-10') return 'right'
  if (side === 'good-0') return 'left'
  return funGutterResolvedGoodSide(group)
}

/**
 * Isolated Fun-gutter pairs leave 3-chains unstaggered
 * because the middle has two partners. Peel remaining
 * degree-1 ends with the same away-from-partner flip so
 * Top Gun (toward Die Hard) sits on the opposite Good
 * side instead of covering the chain. Overlay flip 7
 * already puts Kill Bill on the right of Die Hard, so
 * the leftover peel does not re-flip Kill Bill. Skip
 * Fun-gutter titles already claimed by isolated or
 * interior-neighbor passes so Airplane stays opposite
 * Ghostbusters and Furiosa stays opposite John Wick.
 * Drama's Fun 0-1 mesh has no degree-1 end, so leftover
 * Fun-gutter triangles take Fun stagger on the primary
 * first. Coincident north/south stay put at class
 * apply.
 */
function funGutterCloseGoodChainHorizontalStagger(
  groups: PositionGroup[],
  claimedGood: Map<string, 'good-10' | 'good-0'>,
): Map<string, 'good-10' | 'good-0'> {
  const stagger = new Map<string, 'good-10' | 'good-0'>()
  const candidates = groups.filter(
    (group) =>
      isFunGutterUnstacked(group) && !claimedGood.has(group.key),
  )
  const partners = closeGoodPartners(candidates)
  const used = new Set<string>()
  for (const group of candidates) {
    if (used.has(group.key)) continue
    const list = partners.get(group.key) ?? []
    if (list.length !== 1) continue
    const other = list[0]
    const assignedGood = new Map([...claimedGood, ...stagger])
    if (used.has(other.key)) {
      const otherSide = funGutterAssignedGoodSide(other, assignedGood)
      const mySide = funGutterResolvedGoodSide(group)
      if (mySide === otherSide) {
        const side: 'good-10' | 'good-0' =
          otherSide === 'left' ? 'good-10' : 'good-0'
        if (
          !funGutterIsolatedFlipRestacks(
            group,
            side,
            other,
            assignedGood,
            groups,
          )
        ) {
          stagger.set(group.key, side)
        }
      }
      used.add(group.key)
      continue
    }
    const groupSide = funGutterResolvedGoodSide(group)
    const otherSide = funGutterResolvedGoodSide(other)
    if (groupSide !== otherSide) {
      used.add(group.key)
      used.add(other.key)
      continue
    }
    const [higherGood, lowerGood] =
      group.good >= other.good ? [group, other] : [other, group]
    const side: 'good-10' | 'good-0' =
      groupSide === 'left' ? 'good-10' : 'good-0'
    const flipped = groupSide === 'left' ? higherGood : lowerGood
    const pairOther = flipped.key === group.key ? other : group
    if (
      funGutterIsolatedFlipRestacks(
        flipped,
        side,
        pairOther,
        assignedGood,
        groups,
      )
    ) {
      used.add(group.key)
      used.add(other.key)
      continue
    }
    stagger.set(flipped.key, side)
    used.add(group.key)
    used.add(other.key)
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
  const triangleStagger = interiorCloseGoodTriangleStagger(
    groups,
    verticalStagger,
    horizontalStagger,
    sameSideVertical,
    cliqueStagger.fun,
    cliqueStagger.good,
  )
  const meshStagger = interiorCloseGoodMeshHubStagger(
    groups,
    verticalStagger,
    horizontalStagger,
    sameSideVertical,
    cliqueStagger.fun,
    cliqueStagger.good,
    triangleStagger.fun,
    triangleStagger.good,
  )
  const leftoverMeshStagger = interiorCloseGoodLeftoverMeshTriangleStagger(
    groups,
    verticalStagger,
    horizontalStagger,
    sameSideVertical,
    cliqueStagger.fun,
    cliqueStagger.good,
    triangleStagger.fun,
    triangleStagger.good,
    meshStagger.fun,
    meshStagger.good,
  )
  const leftoverUnique4Stagger = interiorCloseGoodLeftoverMeshUnique4Stagger(
    groups,
    verticalStagger,
    horizontalStagger,
    sameSideVertical,
    cliqueStagger.fun,
    cliqueStagger.good,
    triangleStagger.fun,
    triangleStagger.good,
    meshStagger.fun,
    meshStagger.good,
    leftoverMeshStagger.fun,
    leftoverMeshStagger.good,
  )
  const interiorFun = new Map([
    ...verticalStagger,
    ...sameSideVertical,
    ...cliqueStagger.fun,
    ...triangleStagger.fun,
    ...meshStagger.fun,
    ...leftoverMeshStagger.fun,
    ...leftoverUnique4Stagger.fun,
  ])
  const interiorGood = new Map([
    ...horizontalStagger,
    ...cliqueStagger.good,
    ...triangleStagger.good,
    ...meshStagger.good,
    ...leftoverMeshStagger.good,
    ...leftoverUnique4Stagger.good,
  ])
  const gutterNeighborFun = interiorGutterNeighborFunStagger(
    groups,
    interiorFun,
    interiorGood,
  )
  const funGutterNeighborGood = interiorFunGutterNeighborGoodStagger(
    groups,
    interiorFun,
    interiorGood,
  )
  const claimedGood = new Map([...interiorGood, ...funGutterNeighborGood])
  const funGutterIsolatedGood = funGutterIsolatedCloseGoodHorizontalStagger(
    groups,
    claimedGood,
  )
  const funGutterChainGood = funGutterCloseGoodChainHorizontalStagger(
    groups,
    new Map([...claimedGood, ...funGutterIsolatedGood]),
  )
  const funStagger = new Map([...interiorFun, ...gutterNeighborFun])
  const goodStagger = new Map([
    ...interiorGood,
    ...funGutterNeighborGood,
    ...funGutterIsolatedGood,
    ...funGutterChainGood,
  ])
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
        // Interior same-Good stagger reuses the Fun 10 / Fun 0 growth
        // at ghost-label zoom. Close-Good neighbors of that pair,
        // isolated close-Good pairs with no same-Good neighbor, and
        // remaining degree-1 ends of longer close-Good chains flip
        // left/right like label-start so they sit beside each other
        // instead of covering. Independent same-side collisions after
        // those flips (Lebowski vs Palm Springs, Moana vs On the
        // Basis of Sex) add Fun stagger on top of that Good class.
        // Remaining 4-cliques (Brokeback / Marriage Story / Room /
        // Nomadland) assign both Fun and Good slots at once,
        // size-3 triangles (Naked Gun / Naked Gun old / One of Them
        // Days) reuse three of those slots as a 2-vs-1 split,
        // size-5+ mesh hub peels (Sinners / Clerks / One Battle
        // After Another / Mickey 17 around Knives Out 3) reuse a
        // leftover unique-quadrant 4, leftover mesh of that peel
        // (Knives Out 3 / The Vvitch / The Killer) reuse three
        // of those slots as a triangle, leftover size-5 of
        // that peel (John Wick / Some Like It Hot / Challengers
        // / Logan Lucky after peeling Inside the Mind of a Dog)
        // reuse a leftover unique-quadrant 4, Good-gutter
        // neighbors of those slots (Stand by Me next to Mickey
        // 17) reuse Fun stagger so they do not cover the
        // interior, and Fun-gutter neighbors of those slots
        // (Manchester by the Sea next to Room) reuse Good
        // stagger opposite the interior so they do not cover
        // in the Fun gutter. Isolated Fun-gutter close-Good
        // pairs that those neighbors skipped (Airplane next
        // to Ghostbusters, Inglorious Basterds next to
        // Pirates) reuse that same Good stagger from the
        // Fun-gutter resolved side, and remaining degree-1
        // ends of Fun-gutter 3-chains (Top Gun toward Die
        // Hard) reuse it too. Overlay flip 7 already puts
        // Kill Bill on the right of Die Hard, so the
        // leftover peel only needs Top Gun on Good 10.
        // Drama's leftover Fun 0-1 triangle takes Fun
        // stagger on the primary first. Skip coincident
        // north/south so those names do not restack on
        // the primary that already occupies a slot next
        // to the marker.
        const staggerTowardFun10 =
          !hasVerticalSlot && funStagger.get(group.key) === 'fun-10'
        const staggerTowardFun0 =
          !hasVerticalSlot && funStagger.get(group.key) === 'fun-0'
        const staggerTowardGood10 =
          !hasVerticalSlot && goodStagger.get(group.key) === 'good-10'
        const staggerTowardGood0 =
          !hasVerticalSlot && goodStagger.get(group.key) === 'good-0'
        const gutterIntoFun10 =
          !hasVerticalSlot && group.fun >= LABEL_SOUTH_FUN
        const gutterIntoFun0 =
          !hasVerticalSlot && !gutterIntoFun10 && group.fun <= LABEL_NORTH_FUN
        const gutterIntoGood10 =
          !hasVerticalSlot &&
          group.good >= LABEL_GUTTER_GOOD_HIGH &&
          !staggerTowardGood0
        const gutterIntoGood0 =
          !hasVerticalSlot &&
          !gutterIntoGood10 &&
          group.good <= LABEL_GUTTER_GOOD_LOW &&
          !staggerTowardGood10

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

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
/**
 * Those same pills cover ~0.75 Good units on the default label side.
 * After same-Good vertical stagger, the nearest close-Good neighbor
 * (Grizzly Man at 8.32 vs The Death of Stalin at 8.44) still covers
 * the pair. One neighbor per pair, on the Good side away from the
 * pair, so this does not flip every close-Good title onto one side.
 * Isolated close-Good pairs that are not next to a same-Good pair
 * (Frankenstein vs Back to the Future 3, Ad Astra vs Sicario) get
 * the same left/right flip: one title, the side away from its
 * partner. Remaining degree-1 ends of longer close-Good chains
 * (28 Years Later / Alexander / Bone Temple / Pizza) get that
 * flip next, so the two-partner interiors do not block the ends.
 * Odd-length leftovers of those peels (Indiana Jones after
 * Bourne / Black Panther) flip opposite the claimed partner so
 * the leftover does not keep covering the unflipped middle.
 * Independent same-side collisions after those flips (Lebowski
 * vs Palm Springs both Good 10, Moana vs On the Basis of Sex
 * both Good 0) then split vertically so they do not keep
 * covering on that side. Reuse of label-end would also flip
 * the fit-zoom selected pill.
 */
const INTERIOR_CLOSE_GOOD_GAP = 1
/** Slide the stack-count chip left so Fun/Good ≈10 does not clip it in the 1-unit margin. */
const COUNT_WEST_GOOD = 9

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
  // Already on opposite default sides, so a flip would grow them
  // toward each other across the Good 5 boundary.
  if (higherOnRight !== lowerOnRight) return null
  if (higherOnRight) {
    return { key: lowerGood.key, side: 'good-0' }
  }
  return { key: higherGood.key, side: 'good-10' }
}

function resolvedGoodSide(
  group: PositionGroup,
  assigned: 'good-10' | 'good-0' | undefined,
): 'left' | 'right' {
  if (assigned === 'good-10') return 'right'
  if (assigned === 'good-0') return 'left'
  return group.good < LABEL_FLIP_GOOD ? 'right' : 'left'
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
    if (used.has(other.key)) {
      // Odd-length leftover: the partner was already claimed by
      // the other end of a 3-chain. closeGoodAwayFromPartner
      // would move that claimed middle (Indiana Jones vs Black
      // Panther would restack Black Panther on Bourne). Flip
      // only the leftover, opposite the partner's resolved side.
      if (!requireBothDegreeOne) {
        const otherSide = resolvedGoodSide(other, stagger.get(other.key))
        const mySide = resolvedGoodSide(group, undefined)
        if (mySide === otherSide) {
          stagger.set(
            group.key,
            otherSide === 'left' ? 'good-10' : 'good-0',
          )
        }
      }
      used.add(group.key)
      continue
    }
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
 * Close-Good pairs with no same-Good neighbor still cover each other
 * on the default label side. Pair movies that have exactly one such
 * partner among remaining interior titles, then flip the title that
 * sits toward its partner. Skip pairs already on opposite Good sides,
 * and skip anyone already in same-Good or neighbor stagger so this
 * does not restack Stalin or swallow the 28 Years Later chain.
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
 * instead of covering the chain. Odd-length leftovers of those peels
 * (Indiana Jones after Bourne / Black Panther) then flip opposite
 * the claimed partner. Clique interiors with two leftover partners
 * stay put.
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
 * the Drama clique. Overlay same-side collisions get this stagger
 * at ghost-label zoom.
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
  const funStagger = new Map([...verticalStagger, ...sameSideVertical])

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
        const staggerTowardFun10 = funStagger.get(group.key) === 'fun-10'
        const staggerTowardFun0 = funStagger.get(group.key) === 'fun-0'
        const staggerTowardGood10 = horizontalStagger.get(group.key) === 'good-10'
        const staggerTowardGood0 = horizontalStagger.get(group.key) === 'good-0'
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
              staggerTowardGood10 ? 'movie-point--stagger-good-10' : '',
              staggerTowardGood0 ? 'movie-point--stagger-good-0' : '',
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

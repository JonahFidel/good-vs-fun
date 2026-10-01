export type GhostSelection = {
  ghostId: string
  ghost2Id: string
}

export type GhostRouteParams = {
  deckId: string
  ghost?: string
  ghost2?: string
}

/** Drop a ghost that is the open deck, or a second ghost that repeats the first. */
export function normalizeGhostSelection(
  deckId: string,
  ghostId: string,
  ghost2Id: string,
): GhostSelection {
  const ghost = ghostId && ghostId !== deckId ? ghostId : ''
  const ghost2 =
    ghost2Id && ghost2Id !== deckId && ghost2Id !== ghost ? ghost2Id : ''
  return { ghostId: ghost, ghost2Id: ghost2 }
}

/** Picking a deck into one slot clears it from the other slot. */
export function ghostSelectionAfterPick(
  deckId: string,
  current: GhostSelection,
  slot: 1 | 2,
  nextId: string,
): GhostSelection {
  if (slot === 1) {
    const ghost2Id = nextId && nextId === current.ghost2Id ? '' : current.ghost2Id
    return normalizeGhostSelection(deckId, nextId, ghost2Id)
  }

  const ghostId = nextId && nextId === current.ghostId ? '' : current.ghostId
  return normalizeGhostSelection(deckId, ghostId, nextId)
}

/**
 * Swap the open deck with one ghost.
 * The previous primary becomes that ghost, and the other ghost stays put.
 */
export function swapGhostRoute(
  deckId: string,
  current: GhostSelection,
  slot: 1 | 2,
): GhostRouteParams | null {
  const swapId = slot === 1 ? current.ghostId : current.ghost2Id
  if (!swapId) {
    return null
  }

  const ghost = slot === 1 ? deckId : current.ghostId
  const ghost2 = slot === 2 ? deckId : current.ghost2Id
  const next = normalizeGhostSelection(swapId, ghost, ghost2)
  return {
    deckId: swapId,
    ...(next.ghostId ? { ghost: next.ghostId } : {}),
    ...(next.ghost2Id ? { ghost2: next.ghost2Id } : {}),
  }
}

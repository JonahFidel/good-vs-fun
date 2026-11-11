export const EXAMPLE_DECK_READ_ONLY =
  'Example decks are read-only. Create your own deck to add, move, or remove movies.'

type NoticeListener = (message: string | null) => void

const listeners = new Set<NoticeListener>()
let lastNoticeAt = 0

export function subscribeExampleDeckNotice(listener: NoticeListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function alertExampleDeckReadOnly() {
  const now = Date.now()
  if (now - lastNoticeAt < 1500) {
    return
  }
  lastNoticeAt = now
  for (const listener of listeners) {
    listener(EXAMPLE_DECK_READ_ONLY)
  }
}

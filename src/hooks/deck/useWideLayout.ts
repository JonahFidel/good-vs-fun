import { useSyncExternalStore } from 'react'

const WIDE_QUERY = '(min-width: 901px)'

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia(WIDE_QUERY)
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(WIDE_QUERY).matches
}

function getServerSnapshot() {
  return false
}

/** True at the desktop deck breakpoint (wider than the 900px mobile layout). */
export function useWideLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

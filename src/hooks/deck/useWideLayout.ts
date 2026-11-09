import { useSyncExternalStore } from 'react'

const WIDE_QUERY = '(min-width: 901px)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

function subscribeQuery(query: string, onStoreChange: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function subscribeWide(onStoreChange: () => void) {
  return subscribeQuery(WIDE_QUERY, onStoreChange)
}

function subscribeFinePointer(onStoreChange: () => void) {
  return subscribeQuery(FINE_POINTER_QUERY, onStoreChange)
}

function getWideSnapshot() {
  return window.matchMedia(WIDE_QUERY).matches
}

function getFinePointerSnapshot() {
  return window.matchMedia(FINE_POINTER_QUERY).matches
}

function getServerSnapshot() {
  return false
}

/** True at the desktop deck breakpoint (wider than the 900px mobile layout). */
export function useWideLayout() {
  return useSyncExternalStore(subscribeWide, getWideSnapshot, getServerSnapshot)
}

/** True when the primary pointer is a mouse, not an iPhone or iPad finger. */
export function useFinePointer() {
  return useSyncExternalStore(
    subscribeFinePointer,
    getFinePointerSnapshot,
    getServerSnapshot,
  )
}

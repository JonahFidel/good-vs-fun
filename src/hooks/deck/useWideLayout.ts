import { useSyncExternalStore } from 'react'

/* Keep in sync with the mobile queries in src/styles/responsive.css. */
const NARROW_QUERY = '(max-width: 900px)'
const COARSE_PHONE_QUERY = '(pointer: coarse) and (max-width: 1023px)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

function subscribeQuery(query: string, onStoreChange: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function subscribeWide(onStoreChange: () => void) {
  const unsubNarrow = subscribeQuery(NARROW_QUERY, onStoreChange)
  const unsubCoarsePhone = subscribeQuery(COARSE_PHONE_QUERY, onStoreChange)
  return () => {
    unsubNarrow()
    unsubCoarsePhone()
  }
}

function subscribeFinePointer(onStoreChange: () => void) {
  return subscribeQuery(FINE_POINTER_QUERY, onStoreChange)
}

function getWideSnapshot() {
  return (
    !window.matchMedia(NARROW_QUERY).matches &&
    !window.matchMedia(COARSE_PHONE_QUERY).matches
  )
}

function getFinePointerSnapshot() {
  return window.matchMedia(FINE_POINTER_QUERY).matches
}

function getServerSnapshot() {
  return false
}

/**
 * True on the desktop deck layout. Inverse of the mobile CSS queries:
 * max-width 900px, or a coarse pointer up to 1023px so iPhone Pro Max
 * landscape (~932-956px) still gets collapsed sidebar sections.
 */
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

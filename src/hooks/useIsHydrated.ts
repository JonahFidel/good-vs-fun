import { useSyncExternalStore } from 'react'

function subscribe() {
  return () => {}
}

/**
 * True only after the client has mounted. Use to gate auth-dependent UI and
 * other browser-only state so the first paint stays stable across navigations.
 */
export function useIsHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

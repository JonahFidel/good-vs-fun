import { useEffect } from 'react'

const NATIVE_GESTURE_EVENTS = ['gesturestart', 'gesturechange', 'gestureend'] as const

/**
 * Safari page-zoom fights the plot's own pinch: touch-action: manipulation
 * still allows pinch-zoom, and a two-finger gesture that starts on the Fun
 * axis, header, or sidebar chrome zooms the locked deck page into a clipped
 * mess. Cancel native GestureEvents for the lifetime of the deck page.
 * Custom plot pinch uses Touch Events and keeps working. Do not listen for
 * non-passive touchmove on document - that delays sidebar scrolling.
 */
export function useDisableIosPageZoom() {
  useEffect(() => {
    function preventNativeZoom(event: Event) {
      event.preventDefault()
    }

    const gestureOpts: AddEventListenerOptions = { capture: true, passive: false }
    for (const name of NATIVE_GESTURE_EVENTS) {
      document.addEventListener(name, preventNativeZoom, gestureOpts)
    }

    return () => {
      for (const name of NATIVE_GESTURE_EVENTS) {
        document.removeEventListener(name, preventNativeZoom, gestureOpts)
      }
    }
  }, [])
}

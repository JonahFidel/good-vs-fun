import { useEffect } from 'react'

const NATIVE_GESTURE_EVENTS = ['gesturestart', 'gesturechange', 'gestureend'] as const
const COARSE_POINTER_QUERY = '(pointer: coarse)'

/**
 * Safari page-zoom fights the plot's own pinch: touch-action: manipulation
 * still allows pinch-zoom, and a two-finger gesture that starts on the Fun
 * axis, header, or sidebar chrome zooms the locked deck page into a clipped
 * mess. Cancel native GestureEvents on coarse pointers (iPhone) for the
 * lifetime of the deck page. Custom plot pinch uses Touch Events there.
 * Fine pointers keep GestureEvents so Safari Mac trackpad pinch can zoom
 * the grid; preventDefault on document was swallowing that gesture. Do not
 * listen for non-passive touchmove on document - that delays sidebar scrolling.
 */
export function useDisableIosPageZoom() {
  useEffect(() => {
    if (!window.matchMedia(COARSE_POINTER_QUERY).matches) {
      return
    }

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

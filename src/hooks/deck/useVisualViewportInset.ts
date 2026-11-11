import { useEffect } from 'react'
import { scrollChildIntoAncestor } from '../../lib/scrollChildIntoAncestor'

const KEYBOARD_FIELD_SELECTOR =
  'input[type="text"], input[type="search"], input:not([type]), textarea'

/**
 * Keep a CSS variable for how much the iOS keyboard (or URL bar) covers the
 * layout viewport, and scroll focused inputs into view. The deck page locks
 * overflow, so Safari will not always pan to the caret on its own.
 */
export function useVisualViewportInset() {
  useEffect(() => {
    const root = document.documentElement
    const visualViewport = window.visualViewport

    function syncInset() {
      if (!visualViewport) {
        root.style.setProperty('--keyboard-inset', '0px')
        return 0
      }
      const overlap = Math.max(
        0,
        window.innerHeight - visualViewport.height - visualViewport.offsetTop,
      )
      root.style.setProperty('--keyboard-inset', `${overlap}px`)
      return overlap
    }

    function scrollFocusedKeyboardField() {
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return
      if (!active.matches(KEYBOARD_FIELD_SELECTOR)) return
      scrollChildIntoAncestor(active, { block: 'center', behavior: 'auto' })
    }

    function onViewportResize() {
      const overlap = syncInset()
      // focusin runs at ~80ms, before the iOS keyboard has finished and
      // before --keyboard-inset has shrunk the sidebar. Re-scroll once the
      // visual viewport actually matches the keys, or the caret stays under
      // the keyboard (especially landscape Add, beside a flex-none plot).
      if (overlap > 0) {
        scrollFocusedKeyboardField()
      }
    }

    function onFocusIn(event: FocusEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (!target.matches('input, textarea, select')) return
      window.setTimeout(() => {
        scrollChildIntoAncestor(target, { block: 'center', behavior: 'smooth' })
      }, 80)
    }

    syncInset()
    visualViewport?.addEventListener('resize', onViewportResize)
    visualViewport?.addEventListener('scroll', syncInset)
    window.addEventListener('focusin', onFocusIn)

    return () => {
      visualViewport?.removeEventListener('resize', onViewportResize)
      visualViewport?.removeEventListener('scroll', syncInset)
      window.removeEventListener('focusin', onFocusIn)
      root.style.removeProperty('--keyboard-inset')
    }
  }, [])
}

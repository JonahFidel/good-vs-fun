import { useEffect } from 'react'
import { scrollChildIntoAncestor } from '../../lib/scrollChildIntoAncestor'

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
        return
      }
      const overlap = Math.max(
        0,
        window.innerHeight - visualViewport.height - visualViewport.offsetTop,
      )
      root.style.setProperty('--keyboard-inset', `${overlap}px`)
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
    visualViewport?.addEventListener('resize', syncInset)
    visualViewport?.addEventListener('scroll', syncInset)
    window.addEventListener('focusin', onFocusIn)

    return () => {
      visualViewport?.removeEventListener('resize', syncInset)
      visualViewport?.removeEventListener('scroll', syncInset)
      window.removeEventListener('focusin', onFocusIn)
      root.style.removeProperty('--keyboard-inset')
    }
  }, [])
}

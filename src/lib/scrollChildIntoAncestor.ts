function nearestScrollableAncestor(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement
  while (parent) {
    const { overflowY } = getComputedStyle(parent)
    const canScroll = overflowY === 'auto' || overflowY === 'scroll'
    if (canScroll && parent.scrollHeight > parent.clientHeight + 1) {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

/**
 * Scroll only the nearest overflow ancestor so `element` is visible.
 * Avoids Element.scrollIntoView, which on iOS also shifts the visual
 * viewport of an overflow-locked deck page and knocks the fitted plot.
 */
export function scrollChildIntoAncestor(
  element: HTMLElement,
  {
    block = 'nearest',
    behavior = 'smooth',
  }: {
    block?: 'nearest' | 'center'
    behavior?: ScrollBehavior
  } = {},
) {
  const ancestor = nearestScrollableAncestor(element)
  if (!ancestor) {
    return
  }

  const elRect = element.getBoundingClientRect()
  const anRect = ancestor.getBoundingClientRect()
  let delta = 0
  if (block === 'center') {
    delta = elRect.top - anRect.top - (anRect.height - elRect.height) / 2
  } else if (elRect.top < anRect.top) {
    delta = elRect.top - anRect.top
  } else if (elRect.bottom > anRect.bottom) {
    delta = elRect.bottom - anRect.bottom
  } else {
    return
  }

  ancestor.scrollTo({ top: ancestor.scrollTop + delta, behavior })
}

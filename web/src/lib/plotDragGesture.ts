/** Movement past this distance starts a movie drag instead of a click. */
const MOVIE_DRAG_MOVE_PX = 12

/** Delay before a coarse-pointer pen press on a movie can become a plot pan. */
export const DEFERRED_PAN_HOLD_MS = 120

type PointerPoint = { x: number; y: number }

type PointerLike = Event & { clientX: number; clientY: number; pointerId: number }

/**
 * Follows one pressed movie pointer until it becomes a drag, a click, or is
 * abandoned for a pinch. Returns a cleanup that removes every listener.
 */
export function trackPendingMoviePointer(
  target: EventTarget,
  start: PointerPoint & { pointerId: number },
  {
    onDragStart,
    onClick,
    onCancel,
  }: {
    onDragStart: (point: PointerPoint) => void
    onClick: () => void
    onCancel: () => void
  },
) {
  let dragStarted = false

  const handlePointerMove = (event: Event) => {
    if (dragStarted) {
      return
    }
    const { clientX, clientY } = event as PointerLike
    if (Math.hypot(clientX - start.x, clientY - start.y) < MOVIE_DRAG_MOVE_PX) {
      return
    }
    dragStarted = true
    onDragStart({ x: clientX, y: clientY })
  }

  const handlePointerUp = () => {
    if (dragStarted) {
      return
    }
    onClick()
  }

  const handleSecondPointer = (event: Event) => {
    // The press's own pointerdown can still reach window after this listener
    // is added mid-dispatch; only a different pointer means pinch-zoom.
    if ((event as PointerLike).pointerId === start.pointerId) {
      return
    }
    onCancel()
  }

  const handleSecondTouch = (event: Event) => {
    // iOS Safari does not fire pointerdown for the second finger.
    if ((event as TouchEvent).touches.length >= 2) {
      onCancel()
    }
  }

  target.addEventListener('pointermove', handlePointerMove)
  target.addEventListener('pointerdown', handleSecondPointer)
  target.addEventListener('touchstart', handleSecondTouch, { passive: true })
  target.addEventListener('pointerup', handlePointerUp, { once: true })
  target.addEventListener('pointercancel', handlePointerUp, { once: true })

  return () => {
    target.removeEventListener('pointermove', handlePointerMove)
    target.removeEventListener('pointerdown', handleSecondPointer)
    target.removeEventListener('touchstart', handleSecondTouch)
    target.removeEventListener('pointerup', handlePointerUp)
    target.removeEventListener('pointercancel', handlePointerUp)
  }
}

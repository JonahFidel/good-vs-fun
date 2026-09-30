import { useEffect } from 'react'

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      (target instanceof HTMLInputElement &&
        target.type !== 'range' &&
        target.type !== 'button'))
  )
}

export function useDeckKeyboard({
  isExampleDeck,
  selectedMovieId,
  canUndo,
  canRedo,
  removeMovie,
  undo,
  redo,
}: {
  isExampleDeck: boolean
  selectedMovieId: string | null
  canUndo: boolean
  canRedo: boolean
  removeMovie: (id: string) => void | Promise<void>
  undo: () => void | Promise<void>
  redo: () => void | Promise<void>
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (!selectedMovieId) {
          return
        }
        event.preventDefault()
        void removeMovie(selectedMovieId)
        return
      }

      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') {
        return
      }
      if (isExampleDeck) {
        return
      }

      if (event.shiftKey) {
        if (!canRedo) {
          return
        }
        event.preventDefault()
        void redo()
        return
      }

      if (!canUndo) {
        return
      }
      event.preventDefault()
      void undo()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    canRedo,
    canUndo,
    redo,
    undo,
    isExampleDeck,
    removeMovie,
    selectedMovieId,
  ])
}

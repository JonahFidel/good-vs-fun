import { useCallback, useState, type PointerEvent } from 'react'
import type { MovieHover } from '../../lib/types'

export function useDeckSelection() {
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [hoverLink, setHoverLink] = useState<MovieHover | null>(null)

  const highlightFromList = useCallback((id: string) => {
    setHoverLink({ id, from: 'list' })
  }, [])

  const highlightFromGrid = useCallback((id: string) => {
    setHoverLink({ id, from: 'grid' })
  }, [])

  const clearHoverLink = useCallback(() => {
    setHoverLink(null)
  }, [])

  const selectMovie = useCallback((id: string) => {
    setSelectedMovieId(id)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedMovieId(null)
    // iOS can leave a tap stuck as hover with no mouseleave. Empty-grid
    // deselect must drop that too, or a list tap's title+score pill stays
    // on the fitted 0-10 square after the selection is gone.
    setHoverLink(null)
  }, [])

  const handleSidebarBackgroundPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const target = event.target as Element
      if (
        target.closest('.movie-list li') ||
        target.closest('.movie-selection-panel') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.closest('summary') ||
        // Rename unmounts the field when selection clears. Keep the
        // panel mounted so blur can commit instead of dropping the edit.
        event.currentTarget.querySelector('.movie-selection-panel--renaming')
      ) {
        return
      }
      clearSelection()
    },
    [clearSelection],
  )

  return {
    selectedMovieId,
    setSelectedMovieId,
    hoverLink,
    highlightFromList,
    highlightFromGrid,
    clearHoverLink,
    selectMovie,
    clearSelection,
    handleSidebarBackgroundPointerDown,
  }
}

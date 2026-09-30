import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DeckSidebar } from '../components/deck/DeckSidebar'
import { GhostCompareControls } from '../components/GhostCompareControls'
import { PlotPanel } from '../components/PlotPanel'
import { useDeckMovieActions } from '../hooks/useDeckMovieActions'
import { useGhostCompare } from '../hooks/useGhostCompare'
import { useMoveHistory } from '../hooks/useMoveHistory'
import { usePlotDrag } from '../hooks/usePlotDrag'
import { useApiFetch } from '../lib/api'
import { groupByPosition } from '../lib/groupByPosition'
import type { Movie } from '../lib/types'

export function DeckPage() {
  const { deckId } = useParams()
  const apiFetch = useApiFetch()
  const resolvedDeckId = typeof deckId === 'string' ? deckId : null

  const [deckName, setDeckName] = useState<string>('')
  const [isExampleDeck, setIsExampleDeck] = useState(false)
  const [deckMovies, setDeckMovies] = useState<Movie[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(resolvedDeckId !== null)
  const [trackedDeckLoad, setTrackedDeckLoad] = useState({
    deckId: resolvedDeckId,
    apiFetch,
  })

  if (
    trackedDeckLoad.deckId !== resolvedDeckId ||
    trackedDeckLoad.apiFetch !== apiFetch
  ) {
    setTrackedDeckLoad({ deckId: resolvedDeckId, apiFetch })
    if (resolvedDeckId) {
      setLoading(true)
      setError(null)
    }
  }

  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [hoverLink, setHoverLink] = useState<{
    id: string
    from: 'grid' | 'list'
  } | null>(null)

  const moviesRef = useRef<Movie[]>([])
  const {
    canUndo,
    canRedo,
    captureDragSnapshot,
    discardDragSnapshot,
    recordUndoIfChanged,
    undo,
    redo,
  } = useMoveHistory({
    deckId: resolvedDeckId,
    isExampleDeck,
    moviesRef,
    setMovies: setDeckMovies,
    setError,
  })

  useEffect(() => {
    moviesRef.current = deckMovies
  }, [deckMovies])

  useEffect(() => {
    if (!resolvedDeckId) {
      return
    }

    let isActive = true

    apiFetch(`/api/decks/${resolvedDeckId}`)
      .then((data) => {
        if (!isActive) {
          return
        }
        setDeckName(String(data?.deck?.name ?? ''))
        setIsExampleDeck(Boolean(data?.deck?.isExample))
        setDeckMovies((data?.movies ?? []) as Movie[])
      })
      .catch(() => {
        if (isActive) {
          setError('Failed to load deck.')
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [resolvedDeckId, apiFetch])

  const movieGroups = useMemo(() => groupByPosition(deckMovies), [deckMovies])
  const {
    ghostDeckId,
    ghost2DeckId,
    ghostDeckName,
    ghost2DeckName,
    ghostGroups,
    ghost2Groups,
    otherDecks,
    handleSetGhostDeck,
    handleSetGhost2Deck,
    handleSwapDecks,
  } = useGhostCompare(resolvedDeckId)

  const {
    persistMoviePositions,
    removeMovie,
    handleAddMovie,
    handleDeleteSelected,
    handleRenameSelected,
    handleSelectedScoreAdjustStart,
    handleSelectedScoreCommit,
    handleSelectedFunChange,
    handleSelectedGoodChange,
  } = useDeckMovieActions({
    deckId: resolvedDeckId,
    isExampleDeck,
    moviesRef,
    setMovies: setDeckMovies,
    setError,
    setLoading,
    selectedMovieId,
    setSelectedMovieId,
    captureDragSnapshot,
    recordUndoIfChanged,
  })

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
  }, [])

  const {
    gridRef,
    draggingIds,
    handlePointerDown,
    handleLabelPointerDown,
    handleMovieListPointerDown,
  } = usePlotDrag({
    isExampleDeck,
    moviesRef,
    setMovies: setDeckMovies,
    persistMoviePositions,
    captureDragSnapshot,
    discardDragSnapshot,
    recordUndoIfChanged,
    onSelectMovie: selectMovie,
  })

  const handleSidebarBackgroundPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target as Element
    if (
      target.closest('.movie-list li') ||
      target.closest('.movie-selection-bar') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('a')
    ) {
      return
    }
    clearSelection()
  }

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        (target instanceof HTMLInputElement &&
          target.type !== 'range' &&
          target.type !== 'button'))

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

  return (
    <div
      className={['deck-page-layout', isExampleDeck ? 'deck-page-layout--example' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <PlotPanel
        isExampleDeck={isExampleDeck}
        gridRef={gridRef}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClearSelection={clearSelection}
        ghostDeckId={ghostDeckId}
        ghost2DeckId={ghost2DeckId}
        ghostGroups={ghostGroups}
        ghost2Groups={ghost2Groups}
        movieGroups={movieGroups}
        draggingIds={draggingIds}
        selectedMovieId={selectedMovieId}
        hover={hoverLink}
        onGroupPointerDown={handlePointerDown}
        onLabelPointerDown={handleLabelPointerDown}
        onHighlight={highlightFromGrid}
        onClearHover={clearHoverLink}
      />

      <div className="deck-rail">
        <DeckSidebar
          deckName={deckName}
          isExampleDeck={isExampleDeck}
          error={error}
          loading={loading}
          movies={deckMovies}
          selectedMovieId={selectedMovieId}
          hover={hoverLink}
          onBackgroundPointerDown={handleSidebarBackgroundPointerDown}
          onAddMovie={handleAddMovie}
          onRenameSelected={() => void handleRenameSelected()}
          onDeleteSelected={handleDeleteSelected}
          onScoreAdjustStart={handleSelectedScoreAdjustStart}
          onFunChange={handleSelectedFunChange}
          onGoodChange={handleSelectedGoodChange}
          onScoreCommit={() => void handleSelectedScoreCommit()}
          onMoviePointerDown={handleMovieListPointerDown}
          onHighlightFromList={highlightFromList}
          onClearHover={clearHoverLink}
          onRemoveMovie={(id) => void removeMovie(id)}
        >
          <GhostCompareControls
            primaryName={deckName}
            primaryIsExample={isExampleDeck}
            otherDecks={otherDecks}
            ghostDeckId={ghostDeckId}
            ghost2DeckId={ghost2DeckId}
            ghostDeckName={ghostDeckName}
            ghost2DeckName={ghost2DeckName}
            onGhostDeckChange={handleSetGhostDeck}
            onGhost2DeckChange={handleSetGhost2Deck}
            onSwap={handleSwapDecks}
          />
        </DeckSidebar>
      </div>
    </div>
  )
}


import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { DeckSidebar } from '../components/deck/DeckSidebar'
import { GhostCompareControls } from '../components/GhostCompareControls'
import { PlotPanel } from '../components/plot/PlotPanel'
import { useDeckKeyboard } from '../hooks/useDeckKeyboard'
import { useDeckLoad } from '../hooks/useDeckLoad'
import { useDeckMovieActions } from '../hooks/useDeckMovieActions'
import { useDeckSelection } from '../hooks/useDeckSelection'
import { useSelectedMovieActions } from '../hooks/useSelectedMovieActions'
import { useGhostCompare } from '../hooks/useGhostCompare'
import { useMoveHistory } from '../hooks/useMoveHistory'
import { usePlotDrag } from '../hooks/usePlotDrag'
import { groupByPosition } from '../lib/groupByPosition'

export function DeckPage() {
  const { deckId } = useParams()
  const resolvedDeckId = typeof deckId === 'string' ? deckId : null

  const {
    deckName,
    isExampleDeck,
    movies: deckMovies,
    setMovies: setDeckMovies,
    error,
    setError,
    loading,
    setLoading,
    moviesRef,
  } = useDeckLoad(resolvedDeckId)

  const {
    selectedMovieId,
    setSelectedMovieId,
    hoverLink,
    highlightFromList,
    highlightFromGrid,
    clearHoverLink,
    selectMovie,
    clearSelection,
    handleSidebarBackgroundPointerDown,
  } = useDeckSelection()

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

  const { persistMoviePositions, removeMovie, handleAddMovie } = useDeckMovieActions({
    deckId: resolvedDeckId,
    isExampleDeck,
    moviesRef,
    setMovies: setDeckMovies,
    setError,
    setLoading,
    setSelectedMovieId,
  })

  const {
    handleDeleteSelected,
    handleRenameSelected,
    handleSelectedScoreAdjustStart,
    handleSelectedScoreCommit,
    handleSelectedFunChange,
    handleSelectedGoodChange,
  } = useSelectedMovieActions({
    deckId: resolvedDeckId,
    isExampleDeck,
    moviesRef,
    setMovies: setDeckMovies,
    setError,
    selectedMovieId,
    persistMoviePositions,
    removeMovie,
    captureDragSnapshot,
    recordUndoIfChanged,
  })

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

  useDeckKeyboard({
    isExampleDeck,
    selectedMovieId,
    canUndo,
    canRedo,
    removeMovie,
    undo,
    redo,
  })

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


import type { RefObject } from 'react'
import type { PositionGroup } from '../lib/groupByPosition'
import type { MovieHover } from './deck/MovieList'
import { GhostPoints } from './GhostPoints'
import { GridAxes } from './GridAxes'
import { MoviePoints } from './MoviePoints'
import { PlotGridZoom } from './PlotGridZoom'

export function PlotPanel({
  isExampleDeck,
  gridRef,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearSelection,
  ghostDeckId,
  ghost2DeckId,
  ghostGroups,
  ghost2Groups,
  movieGroups,
  draggingIds,
  selectedMovieId,
  hover,
  onGroupPointerDown,
  onLabelPointerDown,
  onHighlight,
  onClearHover,
}: {
  isExampleDeck: boolean
  gridRef: RefObject<HTMLDivElement | null>
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onClearSelection: () => void
  ghostDeckId: string
  ghost2DeckId: string
  ghostGroups: PositionGroup[]
  ghost2Groups: PositionGroup[]
  movieGroups: PositionGroup[]
  draggingIds: string[] | null
  selectedMovieId: string | null
  hover: MovieHover | null
  onGroupPointerDown: (
    key: string,
    ids: string[],
    primaryId: string,
  ) => (event: React.PointerEvent<HTMLDivElement>) => void
  onLabelPointerDown: (
    id: string,
  ) => (event: React.PointerEvent<HTMLSpanElement>) => void
  onHighlight: (id: string) => void
  onClearHover: () => void
}) {
  const handleBackgroundPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element
    if (target.closest('.movie-point') || target.closest('.grid-toolbar')) {
      return
    }
    onClearSelection()
  }

  return (
    <section className="grid-panel">
      <div
        className={['grid-wrapper', isExampleDeck ? 'grid-wrapper--example' : '']
          .filter(Boolean)
          .join(' ')}
        onPointerDown={handleBackgroundPointerDown}
      >
        {!isExampleDeck && (
          <div className="grid-toolbar">
            <button
              type="button"
              className="btn-undo"
              onClick={() => void onUndo()}
              disabled={!canUndo}
              title="Undo last move (⌘Z)"
            >
              ↩ Undo
            </button>
            <button
              type="button"
              className="btn-undo"
              onClick={() => void onRedo()}
              disabled={!canRedo}
              title="Redo last move (⌘⇧Z)"
            >
              ↪ Redo
            </button>
          </div>
        )}
        <div className="grid-axis grid-axis-y">Fun</div>
        <div className="grid-axis grid-axis-x">Good</div>
        <PlotGridZoom ref={gridRef}>
          <GridAxes />
          {ghostDeckId && <GhostPoints groups={ghostGroups} variant={1} />}
          {ghost2DeckId && <GhostPoints groups={ghost2Groups} variant={2} />}
          <MoviePoints
            groups={movieGroups}
            draggingIds={draggingIds}
            selectedMovieId={selectedMovieId}
            hover={hover}
            onGroupPointerDown={onGroupPointerDown}
            onLabelPointerDown={onLabelPointerDown}
            onHighlight={onHighlight}
            onClearHover={onClearHover}
          />
        </PlotGridZoom>
      </div>
    </section>
  )
}

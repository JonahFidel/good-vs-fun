import type { MouseEvent } from 'react'
import { formatScore } from '../../lib/format'
import type { Movie } from '../../lib/types'
import { ScoreSlider } from './ScoreSlider'
import { SidebarCollapse } from './SidebarCollapse'

function stopSummaryToggle(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
}

function SelectionActions({
  isExampleDeck,
  onRename,
  onDelete,
}: {
  isExampleDeck: boolean
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <div className="movie-selection-actions">
      {!isExampleDeck && (
        <button
          type="button"
          className="btn-rename-selected"
          onClick={(event) => {
            stopSummaryToggle(event)
            onRename()
          }}
        >
          Rename
        </button>
      )}
      <button
        type="button"
        className="btn-delete-selected"
        onClick={(event) => {
          stopSummaryToggle(event)
          onDelete()
        }}
      >
        Delete
      </button>
    </div>
  )
}

export function MovieSelectionPanel({
  movie,
  isExampleDeck,
  onRename,
  onDelete,
  onScoreAdjustStart,
  onFunChange,
  onGoodChange,
  onScoreCommit,
}: {
  movie: Movie
  isExampleDeck: boolean
  onRename: () => void
  onDelete: () => void
  onScoreAdjustStart: () => void
  onFunChange: (value: number) => void
  onGoodChange: (value: number) => void
  onScoreCommit: () => void
}) {
  const scoreMeta = `F ${formatScore(movie.fun)} · G ${formatScore(movie.good)}`
  const actionButtons = (
    <SelectionActions
      isExampleDeck={isExampleDeck}
      onRename={onRename}
      onDelete={onDelete}
    />
  )

  return (
    <SidebarCollapse
      title={movie.title}
      meta={scoreMeta}
      className="deck-sidebar-section movie-selection-panel"
      actions={actionButtons}
    >
      <div className="movie-selection-bar">
        <div className="movie-selection-info">
          <span className="movie-selection-label">Selected</span>
          <strong className="movie-selection-title" title={movie.title}>
            {movie.title}
          </strong>
        </div>
        <SelectionActions
          isExampleDeck={isExampleDeck}
          onRename={onRename}
          onDelete={onDelete}
        />
      </div>
      <div className="score-sliders score-sliders--selected">
        <ScoreSlider
          label="Fun"
          value={movie.fun}
          disabled={isExampleDeck}
          onAdjustStart={onScoreAdjustStart}
          onChange={onFunChange}
          onCommit={onScoreCommit}
        />
        <ScoreSlider
          label="Good"
          value={movie.good}
          disabled={isExampleDeck}
          onAdjustStart={onScoreAdjustStart}
          onChange={onGoodChange}
          onCommit={onScoreCommit}
        />
      </div>
    </SidebarCollapse>
  )
}

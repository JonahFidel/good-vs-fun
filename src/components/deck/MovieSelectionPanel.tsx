import { formatScore } from '../../lib/format'
import type { Movie } from '../../lib/types'
import { ScoreSlider } from './ScoreSlider'
import { SidebarCollapse } from './SidebarCollapse'

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
  const scoreMeta = `${formatScore(movie.fun)} / ${formatScore(movie.good)}`

  return (
    <SidebarCollapse
      title="Selected"
      meta={`${movie.title} · ${scoreMeta}`}
      className="deck-sidebar-section movie-selection-panel"
    >
      <div className="movie-selection-bar">
        <div className="movie-selection-info">
          <span className="movie-selection-label">Selected</span>
          <strong className="movie-selection-title" title={movie.title}>
            {movie.title}
          </strong>
        </div>
        <div className="movie-selection-actions">
          {!isExampleDeck && (
            <button type="button" className="btn-rename-selected" onClick={onRename}>
              Rename
            </button>
          )}
          <button type="button" className="btn-delete-selected" onClick={onDelete}>
            Delete
          </button>
        </div>
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

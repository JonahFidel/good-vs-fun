import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { useWideLayout } from '../../hooks/deck/useWideLayout'
import { formatScore } from '../../lib/format'
import type { Movie } from '../../lib/types'
import { ScoreSlider } from './ScoreSlider'
import { SidebarCollapse } from './SidebarCollapse'

function stopSummaryToggle(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
}

function SelectionActions({
  compact = false,
  isExampleDeck,
  onRename,
  onDelete,
}: {
  compact?: boolean
  isExampleDeck: boolean
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={
        compact
          ? 'movie-selection-actions movie-selection-actions--compact'
          : 'movie-selection-actions'
      }
    >
      {!isExampleDeck && (
        <button
          type="button"
          className="btn-rename-selected"
          title="Rename"
          aria-label="Rename"
          onClick={(event) => {
            stopSummaryToggle(event)
            onRename()
          }}
        >
          {compact ? 'Aa' : 'Rename'}
        </button>
      )}
      <button
        type="button"
        className="btn-delete-selected"
        title="Delete"
        aria-label="Delete"
        onClick={(event) => {
          stopSummaryToggle(event)
          onDelete()
        }}
      >
        {compact ? '×' : 'Delete'}
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
  onRename: (nextTitle: string) => void
  onDelete: () => void
  onScoreAdjustStart: () => void
  onFunChange: (value: number) => void
  onGoodChange: (value: number) => void
  onScoreCommit: () => void
}) {
  const isWide = useWideLayout()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const committingRef = useRef(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [draft, setDraft] = useState(movie.title)
  const [renameMovieId, setRenameMovieId] = useState(movie.id)
  const scoreMeta = `F ${formatScore(movie.fun)} · G ${formatScore(movie.good)}`

  if (movie.id !== renameMovieId) {
    setRenameMovieId(movie.id)
    setIsRenaming(false)
    setDraft(movie.title)
  }

  useLayoutEffect(() => {
    if (!isRenaming) {
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [isRenaming])

  const beginRename = () => {
    if (isExampleDeck || isRenaming) {
      return
    }
    committingRef.current = false
    setDraft(movie.title)
    setIsRenaming(true)
  }

  const cancelRename = () => {
    committingRef.current = true
    setIsRenaming(false)
    setDraft(movie.title)
    queueMicrotask(() => {
      committingRef.current = false
    })
  }

  const commitRename = () => {
    if (committingRef.current) {
      return
    }
    committingRef.current = true
    setIsRenaming(false)
    onRename(draft)
    queueMicrotask(() => {
      committingRef.current = false
    })
  }

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelRename()
    }
  }

  const renameInput = (
    <input
      ref={inputRef}
      className="movie-selection-rename-input"
      type="text"
      value={draft}
      autoComplete="off"
      enterKeyHint="done"
      aria-label="Movie title"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitRename}
      onKeyDown={handleRenameKeyDown}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
    />
  )

  const actionButtons = (
    <SelectionActions
      compact
      isExampleDeck={isExampleDeck}
      onRename={beginRename}
      onDelete={onDelete}
    />
  )

  return (
    <SidebarCollapse
      title={movie.title}
      titleContent={!isWide && isRenaming ? renameInput : undefined}
      meta={scoreMeta}
      className={
        isRenaming
          ? 'deck-sidebar-section movie-selection-panel movie-selection-panel--renaming'
          : 'deck-sidebar-section movie-selection-panel'
      }
      actions={actionButtons}
    >
      <div className="movie-selection-bar">
        <div className="movie-selection-info">
          <span className="movie-selection-label">Selected</span>
          <strong className="movie-selection-title" title={movie.title}>
            {isWide && isRenaming ? renameInput : movie.title}
          </strong>
        </div>
        <SelectionActions
          isExampleDeck={isExampleDeck}
          onRename={beginRename}
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

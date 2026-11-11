import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { flushSync } from 'react-dom'
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
  onRename,
  onDelete,
}: {
  compact?: boolean
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
  const renameArmedRef = useRef(false)
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
      renameArmedRef.current = false
      return
    }
    // Keep the sheet open so the body field stays visible after the
    // summary is hidden. Native <details> would otherwise have no
    // disclosure row to keep [open] latched.
    inputRef.current?.closest('details')?.setAttribute('open', '')
    inputRef.current?.focus()
    inputRef.current?.select()
    // Ignore blur from the plot-hide layout shift so iOS cannot
    // immediately commit and unmount the field we just focused.
    const frame = window.requestAnimationFrame(() => {
      renameArmedRef.current = true
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isRenaming])

  const beginRename = () => {
    if (isExampleDeck || isRenaming) {
      return
    }
    committingRef.current = false
    // flushSync so the input mounts and useLayoutEffect can focus it
    // inside this tap. iOS will not open the keyboard for a focus() that
    // runs after the gesture, and hiding the plot on :focus used to
    // layout-shift the overlay, blur the field, and commit immediately.
    flushSync(() => {
      setDraft(movie.title)
      setIsRenaming(true)
    })
  }

  const cancelRename = () => {
    committingRef.current = true
    renameArmedRef.current = false
    setIsRenaming(false)
    setDraft(movie.title)
    queueMicrotask(() => {
      committingRef.current = false
    })
  }

  const commitRename = (fromBlur = false) => {
    if (committingRef.current) {
      return
    }
    if (fromBlur && !renameArmedRef.current) {
      return
    }
    committingRef.current = true
    renameArmedRef.current = false
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
      onBlur={() => commitRename(true)}
      onKeyDown={handleRenameKeyDown}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
    />
  )

  const actionButtons = isExampleDeck ? null : (
    <SelectionActions compact onRename={beginRename} onDelete={onDelete} />
  )

  return (
    <SidebarCollapse
      title={movie.title}
      meta={scoreMeta}
      className={
        isRenaming
          ? 'deck-sidebar-section movie-selection-panel movie-selection-panel--renaming'
          : 'deck-sidebar-section movie-selection-panel'
      }
      actions={actionButtons}
    >
      {!isWide && isRenaming ? renameInput : null}
      <div className="movie-selection-bar">
        <div className="movie-selection-info">
          <span className="movie-selection-label">Selected</span>
          <strong className="movie-selection-title" title={movie.title}>
            {isWide && isRenaming ? renameInput : movie.title}
          </strong>
        </div>
        {isExampleDeck ? null : (
          <SelectionActions onRename={beginRename} onDelete={onDelete} />
        )}
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

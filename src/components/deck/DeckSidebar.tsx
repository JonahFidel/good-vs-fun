import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatTitle, snapScoreToStep } from '../../lib/format'
import type { Movie, MovieHover } from '../../lib/types'
import { AddMovieForm } from './AddMovieForm'
import { MovieList } from './MovieList'
import { MovieSelectionPanel } from './MovieSelectionPanel'

export function DeckSidebar({
  deckName,
  isExampleDeck,
  error,
  loading,
  movies,
  selectedMovieId,
  hover,
  onBackgroundPointerDown,
  onAddMovie,
  onRenameSelected,
  onDeleteSelected,
  onScoreAdjustStart,
  onFunChange,
  onGoodChange,
  onScoreCommit,
  onMoviePointerDown,
  onHighlightFromList,
  onClearHover,
  onRemoveMovie,
  children,
}: {
  deckName: string
  isExampleDeck: boolean
  error: string | null
  loading: boolean
  movies: Movie[]
  selectedMovieId: string | null
  hover: MovieHover | null
  onBackgroundPointerDown: (event: React.PointerEvent<HTMLElement>) => void
  onAddMovie: (movie: { title: string; fun: number; good: number }) => Promise<boolean>
  onRenameSelected: () => void
  onDeleteSelected: () => void
  onScoreAdjustStart: () => void
  onFunChange: (value: number) => void
  onGoodChange: (value: number) => void
  onScoreCommit: () => void
  onMoviePointerDown: (
    id: string,
  ) => (event: React.PointerEvent<HTMLLIElement>) => void
  onHighlightFromList: (id: string) => void
  onClearHover: () => void
  onRemoveMovie: (id: string) => void
  children?: React.ReactNode
}) {
  const [title, setTitle] = useState('')
  const [fun, setFun] = useState(5)
  const [good, setGood] = useState(5)
  const selectedMovie = movies.find((movie) => movie.id === selectedMovieId) ?? null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      return
    }

    const added = await onAddMovie({
      title: formatTitle(trimmedTitle),
      fun: snapScoreToStep(fun),
      good: snapScoreToStep(good),
    })
    if (added) {
      setTitle('')
    }
  }

  return (
    <aside
      className="panel deck-sidebar"
      onPointerDown={onBackgroundPointerDown}
    >
      <div className="deck-sidebar-section deck-sidebar-section--header">
        <div className="deck-sidebar-top">
          <div className="deck-sidebar-title-block">
            <p className="eyebrow">{isExampleDeck ? 'Example deck' : 'Deck'}</p>
            <h2>
              {deckName || 'Loading…'}
              {isExampleDeck && <span className="deck-example-badge">Example</span>}
            </h2>
          </div>
          <Link className="deck-sidebar-back" to="/decks">
            ← Back to decks
          </Link>
        </div>
      </div>

      {children}

      {error && <p className="error-banner">{error}</p>}
      {loading && <p className="status-line">Syncing changes…</p>}

      {!isExampleDeck && (
        <AddMovieForm
          title={title}
          fun={fun}
          good={good}
          onTitleChange={setTitle}
          onFunChange={setFun}
          onGoodChange={setGood}
          onSubmit={(event) => void handleSubmit(event)}
        />
      )}

      {selectedMovie && (
        <MovieSelectionPanel
          movie={selectedMovie}
          isExampleDeck={isExampleDeck}
          onRename={onRenameSelected}
          onDelete={onDeleteSelected}
          onScoreAdjustStart={onScoreAdjustStart}
          onFunChange={onFunChange}
          onGoodChange={onGoodChange}
          onScoreCommit={onScoreCommit}
        />
      )}

      <MovieList
        movies={movies}
        isExampleDeck={isExampleDeck}
        selectedMovieId={selectedMovieId}
        hover={hover}
        onItemPointerDown={onMoviePointerDown}
        onHighlight={onHighlightFromList}
        onClearHover={onClearHover}
        onRemove={onRemoveMovie}
      />
    </aside>
  )
}

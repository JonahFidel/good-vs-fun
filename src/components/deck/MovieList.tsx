import { useEffect, useMemo, useState } from 'react'
import { alertExampleDeckReadOnly } from '../../lib/exampleDeck'
import { formatScore } from '../../lib/format'
import { scrollChildIntoAncestor } from '../../lib/scrollChildIntoAncestor'
import type { Movie, MovieHover } from '../../lib/types'

type MovieSort = 'title' | 'fun' | 'good'

export function MovieList({
  movies,
  isExampleDeck,
  selectedMovieId,
  hover,
  onItemPointerDown,
  onSelect,
  onHighlight,
  onClearHover,
  onRemove,
}: {
  movies: Movie[]
  isExampleDeck: boolean
  selectedMovieId: string | null
  hover: MovieHover | null
  onItemPointerDown: (
    id: string,
  ) => (event: React.PointerEvent<HTMLLIElement>) => void
  onSelect: (id: string) => void
  onHighlight: (id: string) => void
  onClearHover: () => void
  onRemove: (id: string) => void
}) {
  const [sort, setSort] = useState<MovieSort>('title')

  const sortedMovies = useMemo(() => {
    const nextMovies = [...movies]
    switch (sort) {
      case 'fun':
        return nextMovies.sort((a, b) =>
          b.fun === a.fun ? a.title.localeCompare(b.title) : b.fun - a.fun,
        )
      case 'good':
        return nextMovies.sort((a, b) =>
          b.good === a.good ? a.title.localeCompare(b.title) : b.good - a.good,
        )
      case 'title':
      default:
        return nextMovies.sort((a, b) => a.title.localeCompare(b.title))
    }
  }, [movies, sort])

  useEffect(() => {
    if (!selectedMovieId) {
      return
    }
    const row = document.querySelector(`[data-movie-list-id="${selectedMovieId}"]`)
    if (!(row instanceof HTMLElement)) {
      return
    }
    scrollChildIntoAncestor(row, { block: 'nearest', behavior: 'smooth' })
  }, [selectedMovieId])

  const handleExampleDelete = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    alertExampleDeckReadOnly()
  }

  return (
    <div className="deck-sidebar-section deck-sidebar-section--list movie-list">
      <h3 className="deck-sidebar-section__title deck-sidebar-section__title--inline">
        Movies
      </h3>
      <div className="movie-list-header">
        <label>
          <span className="movie-list-sort-label">Sort movies</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as MovieSort)}
          >
            <option value="title">Title</option>
            <option value="fun">Fun</option>
            <option value="good">Good</option>
          </select>
        </label>
      </div>
      <ul>
        {sortedMovies.map((movie) => (
          <li
            key={movie.id}
            data-movie-list-id={movie.id}
            className={
              [
                selectedMovieId === movie.id ? 'movie-list-item--selected' : '',
                hover?.from === 'grid' && hover.id === movie.id
                  ? 'movie-list-item--highlighted'
                  : '',
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            onPointerDown={onItemPointerDown(movie.id)}
            onClick={(event) => {
              const target = event.target as HTMLElement | null
              if (target?.closest('button')) {
                return
              }
              onSelect(movie.id)
            }}
            onPointerEnter={(event) => {
              // iOS keeps a tap as :hover / mouseenter with no mouseleave.
              // That stuck a title+score pill on the fitted 0-10 grid after
              // the list tap's selection was cleared. List tap already
              // selects; hover-link stays a mouse gesture.
              if (event.pointerType === 'touch') return
              onHighlight(movie.id)
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === 'touch') return
              onClearHover()
            }}
          >
            <div className="movie-list-title">
              <strong title={movie.title}>{movie.title}</strong>
              {isExampleDeck ? (
                <button
                  type="button"
                  className="movie-delete"
                  aria-label={`Remove ${movie.title}`}
                  onClick={handleExampleDelete}
                >
                  ×
                </button>
              ) : (
                <button
                  type="button"
                  className="movie-delete"
                  aria-label={`Remove ${movie.title}`}
                  onClick={() => onRemove(movie.id)}
                >
                  ×
                </button>
              )}
            </div>
            <span className="movie-list-scores">
              F {formatScore(movie.fun)} · G {formatScore(movie.good)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

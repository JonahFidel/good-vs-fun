import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApiFetch } from '../lib/api'
import { formatScore, snapScoreToStep } from '../lib/format'
import type { Deck, Movie } from '../lib/types'
import { GridAxes } from '../components/GridAxes'

type PositionGroup = {
  key: string
  fun: number
  good: number
  titles: string[]
}

function groupMoviesByPosition(movies: Movie[]): PositionGroup[] {
  const groups = new Map<string, PositionGroup>()

  movies.forEach((movie) => {
    const fun = snapScoreToStep(movie.fun)
    const good = snapScoreToStep(movie.good)
    const key = `${fun.toFixed(2)}-${good.toFixed(2)}`
    const existing = groups.get(key)
    if (existing) {
      existing.titles.push(movie.title)
    } else {
      groups.set(key, { key, fun, good, titles: [movie.title] })
    }
  })

  return Array.from(groups.values()).map((group) => ({
    ...group,
    titles: group.titles.sort((a, b) => a.localeCompare(b)),
  }))
}

function ComparePoints({
  groups,
  side,
}: {
  groups: PositionGroup[]
  side: 'a' | 'b'
}) {
  return (
    <>
      {groups.map((group) => {
        const left = (Math.min(10, Math.max(0, group.good)) / 10) * 100
        const top = 100 - (Math.min(10, Math.max(0, group.fun)) / 10) * 100
        return (
          <div
            key={`${side}-${group.key}`}
            className={`movie-point compare-point compare-point-${side}`}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className="movie-label">
              {group.titles.map((title, index) => (
                <span key={`${title}-${index}`} className="movie-label-line">
                  <span className="movie-label-title">{title}</span>
                </span>
              ))}
            </span>
            <span className="movie-point-score" aria-hidden="true">
              Good {formatScore(group.good)} · Fun {formatScore(group.fun)}
            </span>
          </div>
        )
      })}
    </>
  )
}

export function ComparePage() {
  const apiFetch = useApiFetch()
  const [searchParams, setSearchParams] = useSearchParams()

  const [decks, setDecks] = useState<Deck[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const deckAId = searchParams.get('a') ?? ''
  const deckBId = searchParams.get('b') ?? ''

  const [moviesA, setMoviesA] = useState<Movie[]>([])
  const [moviesB, setMoviesB] = useState<Movie[]>([])

  useEffect(() => {
    let isActive = true
    apiFetch('/api/decks')
      .then((data) => {
        if (isActive) {
          setDecks((data?.decks ?? []) as Deck[])
        }
      })
      .catch(() => {
        if (isActive) {
          setError('Failed to load decks.')
        }
      })
    return () => {
      isActive = false
    }
  }, [apiFetch])

  const loadDeckMovies = useCallback(
    async (deckId: string) => {
      const data = await apiFetch(`/api/decks/${deckId}`)
      return (data?.movies ?? []) as Movie[]
    },
    [apiFetch],
  )

  useEffect(() => {
    if (!deckAId) {
      setMoviesA([])
      return
    }
    let isActive = true
    setLoading(true)
    loadDeckMovies(deckAId)
      .then((movies) => {
        if (isActive) {
          setMoviesA(movies)
        }
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
  }, [deckAId, loadDeckMovies])

  useEffect(() => {
    if (!deckBId) {
      setMoviesB([])
      return
    }
    let isActive = true
    setLoading(true)
    loadDeckMovies(deckBId)
      .then((movies) => {
        if (isActive) {
          setMoviesB(movies)
        }
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
  }, [deckBId, loadDeckMovies])

  const setDeck = (side: 'a' | 'b', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(side, value)
    } else {
      next.delete(side)
    }
    setSearchParams(next, { replace: true })
  }

  const groupsA = useMemo(() => groupMoviesByPosition(moviesA), [moviesA])
  const groupsB = useMemo(() => groupMoviesByPosition(moviesB), [moviesB])

  const deckName = (id: string) => decks.find((deck) => deck.id === id)?.name ?? ''

  return (
    <>
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <p className="eyebrow">Compare</p>
            <h2 style={{ margin: 0 }}>Compare two decks</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/decks">← Back to decks</Link>
          </div>
        </div>

        {error && <p className="error-banner">{error}</p>}
        {loading && <p className="status-line">Loading…</p>}

        <div className="compare-controls">
          <label className="field">
            <span className="compare-swatch-label">
              <span className="compare-swatch compare-swatch-a" aria-hidden="true" />
              Deck A (blue)
            </span>
            <select value={deckAId} onChange={(event) => setDeck('a', event.target.value)}>
              <option value="">Select a deck…</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id} disabled={deck.id === deckBId}>
                  {deck.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="compare-swatch-label">
              <span className="compare-swatch compare-swatch-b" aria-hidden="true" />
              Deck B (red)
            </span>
            <select value={deckBId} onChange={(event) => setDeck('b', event.target.value)}>
              <option value="">Select a deck…</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id} disabled={deck.id === deckAId}>
                  {deck.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="grid-panel">
        <div className="grid-header">
          <h2>Good vs. Fun</h2>
          <p>Higher is better. Everything stays in the positive quadrant.</p>
        </div>

        {(deckAId || deckBId) && (
          <div className="compare-legend">
            {deckAId && (
              <span className="compare-legend-item">
                <span className="compare-swatch compare-swatch-a" aria-hidden="true" />
                {deckName(deckAId) || 'Deck A'} ({moviesA.length})
              </span>
            )}
            {deckBId && (
              <span className="compare-legend-item">
                <span className="compare-swatch compare-swatch-b" aria-hidden="true" />
                {deckName(deckBId) || 'Deck B'} ({moviesB.length})
              </span>
            )}
          </div>
        )}

        <div className="grid-wrapper">
          <div className="grid-axis grid-axis-y">Fun (0 → 10)</div>
          <div className="grid-axis grid-axis-x">Good (0 → 10)</div>
          <div className="grid">
            <GridAxes />
            {deckAId && <ComparePoints groups={groupsA} side="a" />}
            {deckBId && <ComparePoints groups={groupsB} side="b" />}
          </div>
        </div>

        {!deckAId && !deckBId && (
          <p className="status-line">Pick two decks above to see them on the same grid.</p>
        )}
      </section>
    </>
  )
}

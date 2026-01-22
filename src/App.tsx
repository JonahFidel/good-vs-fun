import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Deck = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  movieCount?: number
}

type Movie = {
  id: string
  title: string
  fun: number
  good: number
  createdAt?: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

const clampScore = (value: number) => Math.min(10, Math.max(0, value))
const roundScore = (value: number) => Math.round(value * 10) / 10
const formatScore = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(1)
const formatTitle = (value: string) => {
  const smallWords = new Set([
    'a',
    'an',
    'and',
    'as',
    'at',
    'but',
    'by',
    'for',
    'from',
    'in',
    'nor',
    'of',
    'on',
    'or',
    'the',
    'to',
    'with',
  ])

  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index, words) => {
      if (!word) {
        return ''
      }

      const isFirst = index === 0
      const isLast = index === words.length - 1
      if (!isFirst && !isLast && smallWords.has(word)) {
        return word
      }

      return word[0].toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function App() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [deckMovies, setDeckMovies] = useState<Movie[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [deckName, setDeckName] = useState('')
  const [title, setTitle] = useState('')
  const [fun, setFun] = useState(7)
  const [good, setGood] = useState(7)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deckSort, setDeckSort] = useState<'recent' | 'name' | 'count'>(
    'recent',
  )
  const [movieSort, setMovieSort] = useState<'title' | 'fun' | 'good'>('title')
  const [draggingGroup, setDraggingGroup] = useState<{
    key: string
    ids: string[]
  } | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const moviesRef = useRef<Movie[]>([])

  useEffect(() => {
    moviesRef.current = deckMovies
  }, [deckMovies])

  const loadDecks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/decks')
      const nextDecks = data?.decks ?? []
      setDecks(nextDecks)
      if (!selectedDeckId && nextDecks.length > 0) {
        setSelectedDeckId(nextDecks[0].id)
      }
    } catch (err) {
      setError('Failed to load decks.')
    } finally {
      setLoading(false)
    }
  }, [selectedDeckId])

  useEffect(() => {
    loadDecks()
  }, [loadDecks])

  useEffect(() => {
    if (!selectedDeckId) {
      setDeckMovies([])
      return
    }

    let isActive = true

    const loadDeck = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch(`/api/decks/${selectedDeckId}`)
        if (!isActive) {
          return
        }
        setDeckMovies(data?.movies ?? [])
        if (data?.deck) {
          setDecks((current) =>
            current.map((deck) =>
              deck.id === selectedDeckId
                ? {
                    ...deck,
                    name: data.deck.name ?? deck.name,
                    updatedAt: data.deck.updatedAt ?? deck.updatedAt,
                  }
                : deck,
            ),
          )
        }
      } catch (err) {
        if (isActive) {
          setError('Failed to load deck.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadDeck()

    return () => {
      isActive = false
    }
  }, [selectedDeckId])

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) ?? null,
    [decks, selectedDeckId],
  )

  const sortedDecks = useMemo(() => {
    const nextDecks = [...decks]
    switch (deckSort) {
      case 'name':
        return nextDecks.sort((a, b) => a.name.localeCompare(b.name))
      case 'count':
        return nextDecks.sort(
          (a, b) => (b.movieCount ?? 0) - (a.movieCount ?? 0),
        )
      case 'recent':
      default:
        return nextDecks.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
    }
  }, [decks, deckSort])

  const sortedMovies = useMemo(() => {
    const nextMovies = [...deckMovies]
    switch (movieSort) {
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
  }, [deckMovies, movieSort])

  const groupedMovies = useMemo(() => {
    const groups = new Map<
      string,
      {
        fun: number
        good: number
        items: { id: string; title: string }[]
        ids: string[]
      }
    >()

    deckMovies.forEach((movie) => {
      const funScore = roundScore(clampScore(movie.fun))
      const goodScore = roundScore(clampScore(movie.good))
      const key = `${funScore}-${goodScore}`
      const existing = groups.get(key)

      if (existing) {
        existing.items.push({ id: movie.id, title: movie.title })
        existing.ids.push(movie.id)
      } else {
        groups.set(key, {
          fun: funScore,
          good: goodScore,
          items: [{ id: movie.id, title: movie.title }],
          ids: [movie.id],
        })
      }
    })

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.title.localeCompare(b.title)),
    }))
  }, [deckMovies])

  const handleCreateDeck = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = deckName.trim()

    if (!trimmedName) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/decks', {
        method: 'POST',
        body: JSON.stringify({ name: trimmedName }),
      })
      if (data?.deck) {
        setDecks((current) => [data.deck, ...current])
        setSelectedDeckId(data.deck.id)
        setDeckName('')
      }
    } catch (err) {
      setError('Failed to create deck.')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameDeck = async (deck: Deck) => {
    const nextName = window.prompt('Rename deck', deck.name)
    if (!nextName) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/decks/${deck.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: nextName }),
      })
      setDecks((current) =>
        current.map((item) =>
          item.id === deck.id
            ? { ...item, name: data.deck?.name ?? nextName }
            : item,
        ),
      )
    } catch (err) {
      setError('Failed to rename deck.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDeck = async (deck: Deck) => {
    const confirmed = window.confirm(
      `Delete "${deck.name}" and its movies? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      await apiFetch(`/api/decks/${deck.id}`, { method: 'DELETE' })
      setDecks((current) => {
        const remaining = current.filter((item) => item.id !== deck.id)
        if (selectedDeckId === deck.id) {
          setSelectedDeckId(remaining[0]?.id ?? null)
          setDeckMovies([])
        }
        return remaining
      })
    } catch (err) {
      setError('Failed to delete deck.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle || !selectedDeckId) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/decks/${selectedDeckId}/movies`, {
        method: 'POST',
        body: JSON.stringify({
          title: formatTitle(trimmedTitle),
          fun: clampScore(fun),
          good: clampScore(good),
        }),
      })
      if (data?.movie) {
        setDeckMovies((current) => [...current, data.movie])
        setTitle('')
        setDecks((current) =>
          current.map((deck) =>
            deck.id === selectedDeckId
              ? {
                  ...deck,
                  movieCount: (deck.movieCount ?? 0) + 1,
                  updatedAt: new Date().toISOString(),
                }
              : deck,
          ),
        )
      }
    } catch (err) {
      setError('Failed to add movie.')
    } finally {
      setLoading(false)
    }
  }

  const updateMoviePosition = useCallback((ids: string[], clientX: number, clientY: number) => {
    const grid = gridRef.current

    if (!grid) {
      return
    }

    const rect = grid.getBoundingClientRect()
    const clampedX = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const clampedY = Math.min(Math.max(clientY - rect.top, 0), rect.height)

    const nextFun = clampScore((clampedX / rect.width) * 10)
    const nextGood = clampScore((1 - clampedY / rect.height) * 10)

    const idSet = new Set(ids)
    setDeckMovies((current) =>
      current.map((movie) =>
        idSet.has(movie.id)
          ? {
              ...movie,
              fun: roundScore(nextFun),
              good: roundScore(nextGood),
            }
          : movie,
      ),
    )
  }, [])

  const persistMoviePositions = useCallback(
    async (ids: string[]) => {
      if (!selectedDeckId) {
        return
      }

      const idSet = new Set(ids)
      const updates = moviesRef.current.filter((movie) => idSet.has(movie.id))

      try {
        await Promise.all(
          updates.map((movie) =>
            apiFetch(`/api/decks/${selectedDeckId}/movies/${movie.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                fun: movie.fun,
                good: movie.good,
                title: movie.title,
              }),
            }),
          ),
        )
      } catch (err) {
        setError('Failed to save movie positions.')
      }
    },
    [selectedDeckId],
  )

  const removeMovie = async (id: string) => {
    if (!selectedDeckId) {
      return
    }

    setError(null)
    try {
      await apiFetch(`/api/decks/${selectedDeckId}/movies/${id}`, {
        method: 'DELETE',
      })
      setDeckMovies((current) => current.filter((movie) => movie.id !== id))
      setDecks((current) =>
        current.map((deck) =>
          deck.id === selectedDeckId
            ? {
                ...deck,
                movieCount: Math.max(0, (deck.movieCount ?? 0) - 1),
                updatedAt: new Date().toISOString(),
              }
            : deck,
        ),
      )
    } catch (err) {
      setError('Failed to remove movie.')
    }
  }

  const handlePointerDown =
    (key: string, ids: string[]) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDraggingGroup({ key, ids })
      updateMoviePosition(ids, event.clientX, event.clientY)
    }

  useEffect(() => {
    if (!draggingGroup) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateMoviePosition(draggingGroup.ids, event.clientX, event.clientY)
    }

    const handlePointerUp = () => {
      persistMoviePositions(draggingGroup.ids)
      setDraggingGroup(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [draggingGroup, persistMoviePositions, updateMoviePosition])

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Good Fun Movie</p>
          <h1>Rank movies by fun and good</h1>
          <p className="subhead">
            Plot movies on a 0–10 grid to compare how fun vs. how good they are.
          </p>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="deck-controls">
            <div>
              <h2>Decks</h2>
              <p className="subhead">
                Create multiple decks and switch between them anytime.
              </p>
            </div>
            <form className="deck-form" onSubmit={handleCreateDeck}>
              <input
                type="text"
                placeholder="New deck name"
                value={deckName}
                onChange={(event) => setDeckName(event.target.value)}
                required
              />
              <button type="submit">Add deck</button>
            </form>
            <div className="deck-toolbar">
              <label>
                Sort decks
                <select
                  value={deckSort}
                  onChange={(event) =>
                    setDeckSort(
                      event.target.value as 'recent' | 'name' | 'count',
                    )
                  }
                >
                  <option value="recent">Most recent</option>
                  <option value="name">Name</option>
                  <option value="count">Movie count</option>
                </select>
              </label>
            </div>
            <ul className="deck-list">
              {sortedDecks.map((deck) => (
                <li
                  key={deck.id}
                  className={deck.id === selectedDeckId ? 'active' : ''}
                >
                  <button
                    type="button"
                    className="deck-select"
                    onClick={() => setSelectedDeckId(deck.id)}
                  >
                    <span>{deck.name}</span>
                    <span className="deck-meta">
                      {(deck.movieCount ?? 0).toString()} films
                    </span>
                  </button>
                  <div className="deck-actions">
                    <button type="button" onClick={() => handleRenameDeck(deck)}>
                      Rename
                    </button>
                    <button
                      type="button"
                      className="deck-action-delete"
                      onClick={() => handleDeleteDeck(deck)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {error && <p className="error-banner">{error}</p>}
          {loading && <p className="status-line">Syncing changes…</p>}

          {selectedDeck ? (
            <>
              <h2>Add a movie</h2>
              <form className="movie-form" onSubmit={handleSubmit}>
                <label className="field">
                  <span>Movie title</span>
                  <input
                    type="text"
                    placeholder="e.g. Jurassic Park"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Fun (0–10)</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={fun}
                    onChange={(event) => setFun(Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>Good (0–10)</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={good}
                    onChange={(event) => setGood(Number(event.target.value))}
                  />
                </label>
                <button type="submit">Add movie</button>
              </form>

              <div className="movie-list">
                <div className="movie-list-header">
                  <h3>{selectedDeck.name}</h3>
                  <label>
                    Sort movies
                    <select
                      value={movieSort}
                      onChange={(event) =>
                        setMovieSort(
                          event.target.value as 'title' | 'fun' | 'good',
                        )
                      }
                    >
                      <option value="title">Title</option>
                      <option value="fun">Fun</option>
                      <option value="good">Good</option>
                    </select>
                  </label>
                </div>
                <ul>
                  {sortedMovies.map((movie) => (
                    <li key={movie.id}>
                      <div className="movie-list-title">
                        <strong>{movie.title}</strong>
                        <button
                          type="button"
                          className="movie-delete"
                          aria-label={`Remove ${movie.title}`}
                          onClick={() => removeMovie(movie.id)}
                        >
                          ×
                        </button>
                      </div>
                      <span>
                        Fun {formatScore(movie.fun)}/10, Good{' '}
                        {formatScore(movie.good)}/10
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="empty-state">
              Create a deck to start adding movies.
            </p>
          )}
        </section>

        <section className="grid-panel">
          <div className="grid-header">
            <h2>{selectedDeck ? `${selectedDeck.name}` : 'Fun vs. Good'}</h2>
            <p>Higher is better. Everything stays in the positive quadrant.</p>
          </div>
          <div className="grid-wrapper">
            <div className="grid-axis grid-axis-y">Good (0 → 10)</div>
            <div className="grid-axis grid-axis-x">Fun (0 → 10)</div>
            <div className="grid" ref={gridRef}>
              {groupedMovies.map((group) => {
                const left = (clampScore(group.fun) / 10) * 100
                const top = 100 - (clampScore(group.good) / 10) * 100
                const key = `${group.fun}-${group.good}`
                const isDragging = draggingGroup?.key === key

                return (
                  <div
                    key={key}
                    className={`movie-point${isDragging ? ' dragging' : ''}`}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    onPointerDown={handlePointerDown(key, group.ids)}
                  >
                    <span className="movie-label">
                      {group.items.map((item) => (
                        <span key={item.id} className="movie-label-line">
                          {item.title}
                          <button
                            type="button"
                            className="movie-delete"
                            aria-label={`Remove ${item.title}`}
                            onPointerDown={(event) => {
                              event.stopPropagation()
                            }}
                            onClick={(event) => {
                              event.stopPropagation()
                              removeMovie(item.id)
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

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
    type: 'group' | 'single'
    key: string
    ids: string[]
  } | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const moviesRef = useRef<Movie[]>([])
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)

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

  const applyMovieScores = useCallback((ids: string[], fun: number, good: number) => {
    const nextFun = roundScore(clampScore(fun))
    const nextGood = roundScore(clampScore(good))
    const idSet = new Set(ids)

    setDeckMovies((current) =>
      current.map((movie) =>
        idSet.has(movie.id)
          ? {
              ...movie,
              fun: nextFun,
              good: nextGood,
            }
          : movie,
      ),
    )
  }, [])

  const findSnapTarget = useCallback(
    (
      dragging: { type: 'group' | 'single'; key: string; ids: string[] },
      clientX: number,
      clientY: number,
    ): { fun: number; good: number } | null => {
      const grid = gridRef.current
      if (!grid) {
        return null
      }

      const rect = grid.getBoundingClientRect()
      const excludeSet = new Set(dragging.ids)
      const groups = new Map<
        string,
        { fun: number; good: number; ids: string[] }
      >()

      moviesRef.current.forEach((movie) => {
        if (excludeSet.has(movie.id)) {
          return
        }
        const funScore = roundScore(clampScore(movie.fun))
        const goodScore = roundScore(clampScore(movie.good))
        const key = `${funScore}-${goodScore}`
        const existing = groups.get(key)
        if (existing) {
          existing.ids.push(movie.id)
        } else {
          groups.set(key, { fun: funScore, good: goodScore, ids: [movie.id] })
        }
      })

      const intersectionArea = (a: DOMRect, b: DOMRect) => {
        const x1 = Math.max(a.left, b.left)
        const y1 = Math.max(a.top, b.top)
        const x2 = Math.min(a.right, b.right)
        const y2 = Math.min(a.bottom, b.bottom)
        const width = Math.max(0, x2 - x1)
        const height = Math.max(0, y2 - y1)
        return width * height
      }

      const overlapRatio = (a: DOMRect, b: DOMRect) => {
        const areaA = a.width * a.height
        const areaB = b.width * b.height
        if (areaA === 0 || areaB === 0) {
          return 0
        }
        return intersectionArea(a, b) / Math.min(areaA, areaB)
      }

      const overlapThreshold = 0.8

      const draggedRects: DOMRect[] = []
      if (dragging.type === 'single') {
        const draggedTitle = grid.querySelector(
          `[data-movie-id="${CSS.escape(dragging.key)}"]`,
        ) as HTMLElement | null
        if (draggedTitle) {
          draggedRects.push(draggedTitle.getBoundingClientRect())
          const parentPoint = draggedTitle.closest('.movie-point') as HTMLElement | null
          if (parentPoint) {
            draggedRects.push(parentPoint.getBoundingClientRect())
          }
        }
      } else {
        const draggedPoint = grid.querySelector(
          `.movie-point[data-group-key="${CSS.escape(dragging.key)}"]`,
        ) as HTMLElement | null
        if (draggedPoint) {
          draggedRects.push(draggedPoint.getBoundingClientRect())
          const label = draggedPoint.querySelector('.movie-label') as HTMLElement | null
          if (label) {
            draggedRects.push(label.getBoundingClientRect())
          }
        }
      }

      let best: { fun: number; good: number; ratio: number } | null = null

      groups.forEach((group, key) => {
        const groupEl = grid.querySelector(
          `.movie-point[data-group-key="${CSS.escape(key)}"]`,
        ) as HTMLElement | null

        if (!groupEl) {
          return
        }

        if (draggedRects.length === 0) {
          return
        }

        const dotRect = groupEl.getBoundingClientRect()
        const labelEls = groupEl.querySelectorAll(
          '[data-movie-id]',
        ) as NodeListOf<HTMLElement>

        draggedRects.forEach((draggedRect) => {
          const dotRatio = overlapRatio(draggedRect, dotRect)
          if (dotRatio >= overlapThreshold && (!best || dotRatio > best.ratio)) {
            best = { fun: group.fun, good: group.good, ratio: dotRatio }
          }

          labelEls.forEach((labelEl) => {
            const labelRatio = overlapRatio(
              draggedRect,
              labelEl.getBoundingClientRect(),
            )
            if (
              labelRatio >= overlapThreshold &&
              (!best || labelRatio > best.ratio)
            ) {
              best = { fun: group.fun, good: group.good, ratio: labelRatio }
            }
          })
        })
      })

      if (best) {
        const resolvedBest = best as { fun: number; good: number; ratio: number }
        return { fun: resolvedBest.fun, good: resolvedBest.good }
      }

      // Fallback: distance-based snap
      let nearest: { fun: number; good: number } | null = null
      let nearestDistance = Number.POSITIVE_INFINITY
      const threshold = 18

      groups.forEach((group) => {
        // Swapped axes: Good is X-axis, Fun is Y-axis
        const x = rect.left + (clampScore(group.good) / 10) * rect.width
        const y = rect.top + (1 - clampScore(group.fun) / 10) * rect.height
        const distance = Math.hypot(clientX - x, clientY - y)
        if (distance <= threshold && distance < nearestDistance) {
          nearest = { fun: group.fun, good: group.good }
          nearestDistance = distance
        }
      })

      if (!nearest) {
        return null
      }

      const resolvedNearest = nearest as { fun: number; good: number }
      return { fun: resolvedNearest.fun, good: resolvedNearest.good }
    },
    [],
  )

  const updateMoviePosition = useCallback(
    (
      dragging: { type: 'group' | 'single'; key: string; ids: string[] },
      clientX: number,
      clientY: number,
    ) => {
      const grid = gridRef.current

      if (!grid) {
        return
      }

      const rect = grid.getBoundingClientRect()
      const clampedX = Math.min(Math.max(clientX - rect.left, 0), rect.width)
      const clampedY = Math.min(Math.max(clientY - rect.top, 0), rect.height)

      // Swapped axes: Good is X-axis, Fun is Y-axis
      const nextGood = clampScore((clampedX / rect.width) * 10)
      const nextFun = clampScore((1 - clampedY / rect.height) * 10)
      applyMovieScores(dragging.ids, nextFun, nextGood)
    },
    [applyMovieScores],
  )

  const persistMoviePositions = useCallback(
    async (ids: string[], override?: { fun: number; good: number }) => {
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
                fun: override?.fun ?? movie.fun,
                good: override?.good ?? movie.good,
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
      // Only start group-drag when grabbing the dot itself (not its labels)
      if (event.target !== event.currentTarget) {
        return
      }
      event.preventDefault()
      const drag = { type: 'group' as const, key, ids }
      setDraggingGroup(drag)
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(drag, event.clientX, event.clientY)
    }

  const handleLabelPointerDown =
    (id: string) => (event: React.PointerEvent<HTMLSpanElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const drag = { type: 'single' as const, key: id, ids: [id] }
      setDraggingGroup(drag)
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(drag, event.clientX, event.clientY)
    }

  useEffect(() => {
    if (!draggingGroup) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(draggingGroup, event.clientX, event.clientY)
    }

    const handlePointerUp = () => {
      const last = lastPointerRef.current
      const snapTarget =
        last ? findSnapTarget(draggingGroup, last.x, last.y) : null

      if (snapTarget) {
        applyMovieScores(draggingGroup.ids, snapTarget.fun, snapTarget.good)
        persistMoviePositions(draggingGroup.ids, snapTarget)
      } else {
        persistMoviePositions(draggingGroup.ids)
      }
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
  }, [
    applyMovieScores,
    draggingGroup,
    findSnapTarget,
    persistMoviePositions,
    updateMoviePosition,
  ])

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Good Fun Movie</p>
          <h1>Rank movies by good and fun</h1>
          <p className="subhead">
            Plot movies on a 0–10 grid to compare how good vs. how fun they are.
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
            <h2>{selectedDeck ? `${selectedDeck.name}` : 'Good vs. Fun'}</h2>
            <p>Higher is better. Everything stays in the positive quadrant.</p>
          </div>
          <div className="grid-wrapper">
            <div className="grid-axis grid-axis-y">Fun (0 → 10)</div>
            <div className="grid-axis grid-axis-x">Good (0 → 10)</div>
            <div className="grid" ref={gridRef}>
              {groupedMovies.map((group) => {
                // Swapped axes: Good is X-axis, Fun is Y-axis
                const left = (clampScore(group.good) / 10) * 100
                const top = 100 - (clampScore(group.fun) / 10) * 100
                const key = `${group.fun}-${group.good}`
                const isDragging =
                  draggingGroup?.type === 'group' && draggingGroup.key === key

                return (
                  <div
                    key={key}
                    className={`movie-point${isDragging ? ' dragging' : ''}`}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    onPointerDown={handlePointerDown(key, group.ids)}
                    data-group-key={key}
                  >
                    <span
                      className="movie-label"
                      onPointerDown={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      {group.items.map((item) => (
                        <span
                          key={item.id}
                          className="movie-label-line"
                        >
                          <span
                            className="movie-label-title"
                            data-movie-id={item.id}
                            onPointerDownCapture={handleLabelPointerDown(item.id)}
                          >
                            {item.title}
                          </span>
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

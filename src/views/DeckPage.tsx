import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { formatScore, formatTitle, snapScoreToStep } from '../lib/format'
import type { Movie } from '../lib/types'

type DragState = {
  type: 'group' | 'single'
  key: string
  ids: string[]
  origin: 'grid' | 'list'
}

export function DeckPage() {
  const { deckId } = useParams()
  const resolvedDeckId = typeof deckId === 'string' ? deckId : null

  const [deckName, setDeckName] = useState<string>('')
  const [deckMovies, setDeckMovies] = useState<Movie[]>([])
  const [title, setTitle] = useState('')
  const [fun, setFun] = useState(7)
  const [good, setGood] = useState(7)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [movieSort, setMovieSort] = useState<'title' | 'fun' | 'good'>('title')

  const [draggingGroup, setDraggingGroup] = useState<DragState | null>(null)
  const [pendingMovieDrag, setPendingMovieDrag] = useState<{
    id: string
    x: number
    y: number
    startedAt: number
  } | null>(null)

  const gridRef = useRef<HTMLDivElement | null>(null)
  const moviesRef = useRef<Movie[]>([])
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const lastInGridPointerRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    moviesRef.current = deckMovies
  }, [deckMovies])

  useEffect(() => {
    if (!resolvedDeckId) {
      return
    }

    let isActive = true
    setLoading(true)
    setError(null)

    apiFetch(`/api/decks/${resolvedDeckId}`)
      .then((data) => {
        if (!isActive) {
          return
        }
        setDeckName(String(data?.deck?.name ?? ''))
        setDeckMovies((data?.movies ?? []) as Movie[])
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
  }, [resolvedDeckId])

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
        key: string
        fun: number
        good: number
        items: { id: string; title: string }[]
        ids: string[]
      }
    >()

    deckMovies.forEach((movie) => {
      const funScore = snapScoreToStep(movie.fun)
      const goodScore = snapScoreToStep(movie.good)
      const key = `${funScore.toFixed(2)}-${goodScore.toFixed(2)}`
      const existing = groups.get(key)
      if (existing) {
        existing.items.push({ id: movie.id, title: movie.title })
        existing.ids.push(movie.id)
      } else {
        groups.set(key, {
          key,
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

  const applyMovieScores = useCallback((ids: string[], fun: number, good: number) => {
    const nextFun = snapScoreToStep(fun)
    const nextGood = snapScoreToStep(good)
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

  const persistMoviePositions = useCallback(
    async (ids: string[], override?: { fun: number; good: number }) => {
      if (!resolvedDeckId) {
        return
      }

      const idSet = new Set(ids)
      const updates = moviesRef.current.filter((movie) => idSet.has(movie.id))

      try {
        await Promise.all(
          updates.map((movie) =>
            apiFetch(`/api/decks/${resolvedDeckId}/movies/${movie.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                fun: override?.fun ?? movie.fun,
                good: override?.good ?? movie.good,
                title: movie.title,
              }),
            }),
          ),
        )
      } catch {
        setError('Failed to save movie positions.')
      }
    },
    [resolvedDeckId],
  )

  const removeMovie = async (id: string) => {
    if (!resolvedDeckId) {
      return
    }

    setError(null)
    try {
      await apiFetch(`/api/decks/${resolvedDeckId}/movies/${id}`, {
        method: 'DELETE',
      })
      setDeckMovies((current) => current.filter((movie) => movie.id !== id))
    } catch {
      setError('Failed to remove movie.')
    }
  }

  const findSnapTarget = useCallback(
    (dragging: DragState, clientX: number, clientY: number) => {
      const grid = gridRef.current
      if (!grid) {
        return null
      }

      const rect = grid.getBoundingClientRect()

      // Same-cell snapping: when you drop on another point/label.
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

      const excludeSet = new Set(dragging.ids)
      const groups = new Map<string, { fun: number; good: number; ids: string[] }>()

      moviesRef.current.forEach((movie) => {
        if (excludeSet.has(movie.id)) {
          return
        }
        const funScore = snapScoreToStep(movie.fun)
        const goodScore = snapScoreToStep(movie.good)
        const key = `${funScore.toFixed(2)}-${goodScore.toFixed(2)}`
        const existing = groups.get(key)
        if (existing) {
          existing.ids.push(movie.id)
        } else {
          groups.set(key, { fun: funScore, good: goodScore, ids: [movie.id] })
        }
      })

      const overlapThreshold = 0.8
      const draggedRects: DOMRect[] = []

      const gridEl = gridRef.current
      if (!gridEl) {
        return null
      }

      if (dragging.type === 'single') {
        const draggedTitle = gridEl.querySelector(
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
        const draggedPoint = gridEl.querySelector(
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

      for (const [key, group] of groups.entries()) {
        const groupEl = gridEl.querySelector(
          `.movie-point[data-group-key="${CSS.escape(key)}"]`,
        ) as HTMLElement | null
        if (!groupEl || draggedRects.length === 0) {
          continue
        }

        const dotRect = groupEl.getBoundingClientRect()
        const labelEls = Array.from(
          groupEl.querySelectorAll('[data-movie-id]') as NodeListOf<HTMLElement>,
        )

        for (const draggedRect of draggedRects) {
          const dotRatio = overlapRatio(draggedRect, dotRect)
          if (dotRatio >= overlapThreshold && (!best || dotRatio > best.ratio)) {
            best = { fun: group.fun, good: group.good, ratio: dotRatio }
          }

          for (const labelEl of labelEls) {
            const labelRatio = overlapRatio(draggedRect, labelEl.getBoundingClientRect())
            if (labelRatio >= overlapThreshold && (!best || labelRatio > best.ratio)) {
              best = { fun: group.fun, good: group.good, ratio: labelRatio }
            }
          }
        }
      }

      if (best !== null) {
        return { fun: best.fun, good: best.good }
      }

      // Otherwise, snap to the step grid where you released (inside the grid).
      const clampedX = Math.min(Math.max(clientX - rect.left, 0), rect.width)
      const clampedY = Math.min(Math.max(clientY - rect.top, 0), rect.height)
      const good = snapScoreToStep((clampedX / rect.width) * 10)
      const fun = snapScoreToStep((1 - clampedY / rect.height) * 10)
      return { fun, good }
    },
    [],
  )

  const updateMoviePosition = useCallback(
    (dragging: DragState, clientX: number, clientY: number) => {
      const grid = gridRef.current
      if (!grid) {
        return
      }
      const rect = grid.getBoundingClientRect()

      // Key fix: if you're dragging from the left list, do nothing until you
      // actually enter the grid (prevents jump-to-edge like 0,0).
      if (
        dragging.origin === 'list' &&
        (clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom)
      ) {
        return
      }

      const clampedX = Math.min(Math.max(clientX - rect.left, 0), rect.width)
      const clampedY = Math.min(Math.max(clientY - rect.top, 0), rect.height)
      const nextGood = snapScoreToStep((clampedX / rect.width) * 10)
      const nextFun = snapScoreToStep((1 - clampedY / rect.height) * 10)
      applyMovieScores(dragging.ids, nextFun, nextGood)
    },
    [applyMovieScores],
  )

  const handlePointerDown =
    (key: string, ids: string[]) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return
      }
      event.preventDefault()
      const drag: DragState = { type: 'group', key, ids, origin: 'grid' }
      setDraggingGroup(drag)
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(drag, event.clientX, event.clientY)
    }

  const handleLabelPointerDown =
    (id: string) => (event: React.PointerEvent<HTMLSpanElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const drag: DragState = { type: 'single', key: id, ids: [id], origin: 'grid' }
      setDraggingGroup(drag)
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(drag, event.clientX, event.clientY)
    }

  const handleMovieListPointerDown =
    (id: string) => (event: React.PointerEvent<HTMLLIElement>) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('button')) {
        return
      }
      setPendingMovieDrag({
        id,
        x: event.clientX,
        y: event.clientY,
        startedAt: performance.now(),
      })
    }

  useEffect(() => {
    if (!pendingMovieDrag) {
      return
    }

    const threshold = 12
    const minHoldMs = 120

    const handlePointerMove = (event: PointerEvent) => {
      if (performance.now() - pendingMovieDrag.startedAt < minHoldMs) {
        return
      }
      const dx = event.clientX - pendingMovieDrag.x
      const dy = event.clientY - pendingMovieDrag.y
      if (Math.hypot(dx, dy) < threshold) {
        return
      }

      const drag: DragState = {
        type: 'single',
        key: pendingMovieDrag.id,
        ids: [pendingMovieDrag.id],
        origin: 'list',
      }
      setPendingMovieDrag(null)
      setDraggingGroup(drag)
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(drag, event.clientX, event.clientY)
    }

    const handlePointerUp = () => setPendingMovieDrag(null)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
    window.addEventListener('pointercancel', handlePointerUp, { once: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [pendingMovieDrag, updateMoviePosition])

  useEffect(() => {
    if (!draggingGroup) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(draggingGroup, event.clientX, event.clientY)

      if (draggingGroup.origin === 'list') {
        const grid = gridRef.current
        if (!grid) {
          return
        }
        const rect = grid.getBoundingClientRect()
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          lastInGridPointerRef.current = { x: event.clientX, y: event.clientY }
        }
      }
    }

    const handlePointerUp = () => {
      const last =
        draggingGroup.origin === 'list'
          ? lastInGridPointerRef.current
          : lastPointerRef.current

      // If you dragged from the list but never entered the grid: no change.
      if (draggingGroup.origin === 'list' && !last) {
        setDraggingGroup(null)
        return
      }

      const snapTarget = last ? findSnapTarget(draggingGroup, last.x, last.y) : null
      if (snapTarget) {
        applyMovieScores(draggingGroup.ids, snapTarget.fun, snapTarget.good)
        persistMoviePositions(draggingGroup.ids, snapTarget)
      } else {
        persistMoviePositions(draggingGroup.ids)
      }
      setDraggingGroup(null)
      lastInGridPointerRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [applyMovieScores, draggingGroup, findSnapTarget, persistMoviePositions, updateMoviePosition])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !resolvedDeckId) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/decks/${resolvedDeckId}/movies`, {
        method: 'POST',
        body: JSON.stringify({
          title: formatTitle(trimmedTitle),
          fun: snapScoreToStep(fun),
          good: snapScoreToStep(good),
        }),
      })
      if (data?.movie) {
        setDeckMovies((current) => [...current, data.movie as Movie])
        setTitle('')
      }
    } catch {
      setError('Failed to add movie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <p className="eyebrow">Deck</p>
            <h2 style={{ margin: 0 }}>{deckName || 'Loading…'}</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/decks">← Back to decks</Link>
          </div>
        </div>

        {error && <p className="error-banner">{error}</p>}
        {loading && <p className="status-line">Syncing changes…</p>}

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
              step={0.01}
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
              step={0.01}
              value={good}
              onChange={(event) => setGood(Number(event.target.value))}
            />
          </label>
          <button type="submit">Add movie</button>
        </form>

        <div className="movie-list">
          <div className="movie-list-header">
            <h3>Movies</h3>
            <label>
              Sort movies
              <select
                value={movieSort}
                onChange={(event) =>
                  setMovieSort(event.target.value as 'title' | 'fun' | 'good')
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
              <li key={movie.id} onPointerDown={handleMovieListPointerDown(movie.id)}>
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
                  Fun {formatScore(movie.fun)}/10, Good {formatScore(movie.good)}/10
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="grid-panel">
        <div className="grid-header">
          <h2>{deckName ? `${deckName}` : 'Good vs. Fun'}</h2>
          <p>Higher is better. Everything stays in the positive quadrant.</p>
        </div>
        <div className="grid-wrapper">
          <div className="grid-axis grid-axis-y">Fun (0 → 10)</div>
          <div className="grid-axis grid-axis-x">Good (0 → 10)</div>
          <div className="grid" ref={gridRef}>
            {groupedMovies.map((group) => {
              const left = (Math.min(10, Math.max(0, group.good)) / 10) * 100
              const top = 100 - (Math.min(10, Math.max(0, group.fun)) / 10) * 100
              const key = group.key
              const isDragging = draggingGroup?.type === 'group' && draggingGroup.key === key

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
                      <span key={item.id} className="movie-label-line">
                        <span
                          className="movie-label-title"
                          data-movie-id={item.id}
                          onPointerDownCapture={handleLabelPointerDown(item.id)}
                        >
                          {item.title}
                        </span>
                      </span>
                    ))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}


import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApiFetch } from '../lib/api'
import { formatScore, formatTitle, snapScoreToStep } from '../lib/format'
import { alertExampleDeckReadOnly } from '../lib/exampleDeck'
import { pointerRatioToScore, scoreToPlotPercent } from '../lib/gridCanvas'
import type { Deck, Movie } from '../lib/types'
import { GridAxes } from '../components/GridAxes'
import { PlotGridZoom } from '../components/PlotGridZoom'
import { ScoreSlider } from '../components/ScoreSlider'

// ── Ghost-deck helpers ────────────────────────────────────────────────────────

type PositionGroup = {
  key: string
  fun: number
  good: number
  titles: string[]
}

function groupByPosition(movies: Movie[]): PositionGroup[] {
  const groups = new Map<string, PositionGroup>()
  movies.forEach((m) => {
    const fun = snapScoreToStep(m.fun)
    const good = snapScoreToStep(m.good)
    const key = `${fun.toFixed(2)}-${good.toFixed(2)}`
    const existing = groups.get(key)
    if (existing) {
      existing.titles.push(m.title)
    } else {
      groups.set(key, { key, fun, good, titles: [m.title] })
    }
  })
  return Array.from(groups.values()).map((g) => ({
    ...g,
    titles: g.titles.sort((a, b) => a.localeCompare(b)),
  }))
}

function GhostPoints({ groups }: { groups: PositionGroup[] }) {
  return (
    <>
      {groups.map((group) => {
        const left = scoreToPlotPercent(group.good, 'x')
        const top = scoreToPlotPercent(group.fun, 'y')
        return (
          <div
            key={`ghost-${group.key}`}
            className="movie-point ghost-point"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className="movie-label">
              {group.titles.map((title) => (
                <span key={title} className="movie-label-line">
                  <span className="movie-label-title">{title}</span>
                </span>
              ))}
            </span>
          </div>
        )
      })}
    </>
  )
}

type DragState = {
  type: 'group' | 'single'
  key: string
  ids: string[]
  origin: 'grid' | 'list'
}

type MoviePosition = {
  id: string
  fun: number
  good: number
}

export function DeckPage() {
  const { deckId } = useParams()
  const apiFetch = useApiFetch()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const resolvedDeckId = typeof deckId === 'string' ? deckId : null
  const ghostDeckId = searchParams.get('ghost') ?? ''

  const [deckName, setDeckName] = useState<string>('')
  const [isExampleDeck, setIsExampleDeck] = useState(false)
  const [deckMovies, setDeckMovies] = useState<Movie[]>([])
  const [title, setTitle] = useState('')
  const [fun, setFun] = useState(7)
  const [good, setGood] = useState(7)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [movieSort, setMovieSort] = useState<'title' | 'fun' | 'good'>('title')

  // Ghost deck state
  const [allDecks, setAllDecks] = useState<Deck[]>([])
  const [ghostMovies, setGhostMovies] = useState<Movie[]>([])
  const [ghostDeckName, setGhostDeckName] = useState('')

  const [draggingGroup, setDraggingGroup] = useState<DragState | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [pendingPointer, setPendingPointer] = useState<{
    primaryId: string
    drag: DragState
    x: number
    y: number
    startedAt: number
  } | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [hoverLink, setHoverLink] = useState<{
    id: string
    from: 'grid' | 'list'
  } | null>(null)

  const gridRef = useRef<HTMLDivElement | null>(null)
  const moviesRef = useRef<Movie[]>([])
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const lastInGridPointerRef = useRef<{ x: number; y: number } | null>(null)
  const dragStartSnapshotRef = useRef<MoviePosition[] | null>(null)
  const lastMoveRef = useRef<{ before: MoviePosition[]; after: MoviePosition[] } | null>(
    null,
  )

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
        setIsExampleDeck(Boolean(data?.deck?.isExample))
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
  }, [resolvedDeckId, apiFetch])

  useEffect(() => {
    dragStartSnapshotRef.current = null
    lastMoveRef.current = null
    setCanUndo(false)
    setCanRedo(false)
  }, [resolvedDeckId])

  // Load all decks for the ghost selector
  useEffect(() => {
    let isActive = true
    apiFetch('/api/decks')
      .then((data) => {
        if (isActive) setAllDecks((data?.decks ?? []) as Deck[])
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [apiFetch])

  // Load ghost deck movies whenever the ghost ID changes
  useEffect(() => {
    if (!ghostDeckId) {
      setGhostMovies([])
      setGhostDeckName('')
      return
    }
    let isActive = true
    apiFetch(`/api/decks/${ghostDeckId}`)
      .then((data) => {
        if (isActive) {
          setGhostMovies((data?.movies ?? []) as Movie[])
          setGhostDeckName(String(data?.deck?.name ?? ''))
        }
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [ghostDeckId, apiFetch])

  const ghostGroups = useMemo(() => groupByPosition(ghostMovies), [ghostMovies])
  const otherDecks = useMemo(
    () => allDecks.filter((d) => d.id !== resolvedDeckId),
    [allDecks, resolvedDeckId],
  )

  function handleSetGhostDeck(id: string) {
    if (id) {
      setSearchParams({ ghost: id }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  function handleSwapDecks() {
    if (!resolvedDeckId || !ghostDeckId) return
    navigate(`/deck/${ghostDeckId}/movies?ghost=${resolvedDeckId}`)
  }

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

  const captureDragSnapshot = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    dragStartSnapshotRef.current = moviesRef.current
      .filter((movie) => idSet.has(movie.id))
      .map((movie) => ({ id: movie.id, fun: movie.fun, good: movie.good }))
  }, [])

  const applyMovieScores = useCallback((ids: string[], fun: number, good: number) => {
    const nextFun = snapScoreToStep(fun)
    const nextGood = snapScoreToStep(good)
    const idSet = new Set(ids)

    setDeckMovies((current) => {
      const next = current.map((movie) =>
        idSet.has(movie.id)
          ? {
              ...movie,
              fun: nextFun,
              good: nextGood,
            }
          : movie,
      )
      moviesRef.current = next
      return next
    })
  }, [])

  const updateMovieAxisScore = useCallback(
    (id: string, axis: 'fun' | 'good', value: number) => {
      const snapped = snapScoreToStep(value)
      setDeckMovies((current) => {
        const next = current.map((movie) =>
          movie.id === id ? { ...movie, [axis]: snapped } : movie,
        )
        moviesRef.current = next
        return next
      })
    },
    [],
  )

  const recordUndoIfChanged = useCallback(() => {
    const before = dragStartSnapshotRef.current
    dragStartSnapshotRef.current = null
    if (!before || before.length === 0) {
      return
    }

    const changed = before.some((entry) => {
      const movie = moviesRef.current.find((item) => item.id === entry.id)
      if (!movie) {
        return false
      }
      return (
        snapScoreToStep(movie.fun) !== snapScoreToStep(entry.fun) ||
        snapScoreToStep(movie.good) !== snapScoreToStep(entry.good)
      )
    })

    if (!changed) {
      return
    }

    const after = before.map((entry) => {
      const movie = moviesRef.current.find((item) => item.id === entry.id)
      return movie
        ? { id: movie.id, fun: movie.fun, good: movie.good }
        : entry
    })

    lastMoveRef.current = { before, after }
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const applyPositions = useCallback(
    async (positions: MoviePosition[], errorMessage: string) => {
      if (!resolvedDeckId || isExampleDeck) {
        return false
      }

      setError(null)
      setDeckMovies((current) => {
        const next = current.map((movie) => {
          const update = positions.find((item) => item.id === movie.id)
          return update ? { ...movie, fun: update.fun, good: update.good } : movie
        })
        moviesRef.current = next
        return next
      })

      try {
        await Promise.all(
          positions.map((movie) => {
            const current = moviesRef.current.find((item) => item.id === movie.id)
            return apiFetch(`/api/decks/${resolvedDeckId}/movies/${movie.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                fun: movie.fun,
                good: movie.good,
                title: current?.title ?? '',
              }),
            })
          }),
        )
        return true
      } catch {
        setError(errorMessage)
        return false
      }
    },
    [apiFetch, isExampleDeck, resolvedDeckId],
  )

  const handleUndo = useCallback(async () => {
    const entry = lastMoveRef.current
    if (!entry || !canUndo) {
      return
    }

    const ok = await applyPositions(entry.before, 'Failed to undo move.')
    if (ok) {
      setCanUndo(false)
      setCanRedo(true)
    }
  }, [applyPositions, canUndo])

  const handleRedo = useCallback(async () => {
    const entry = lastMoveRef.current
    if (!entry || !canRedo) {
      return
    }

    const ok = await applyPositions(entry.after, 'Failed to redo move.')
    if (ok) {
      setCanUndo(true)
      setCanRedo(false)
    }
  }, [applyPositions, canRedo])

  const persistMoviePositions = useCallback(
    async (ids: string[], override?: { fun: number; good: number }) => {
      if (!resolvedDeckId || isExampleDeck) {
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
    [resolvedDeckId, apiFetch, isExampleDeck],
  )

  const removeMovie = useCallback(
    async (id: string) => {
      if (!resolvedDeckId || isExampleDeck) {
        if (isExampleDeck) {
          alertExampleDeckReadOnly()
        }
        return
      }

      setError(null)
      try {
        await apiFetch(`/api/decks/${resolvedDeckId}/movies/${id}`, {
          method: 'DELETE',
        })
        setDeckMovies((current) => current.filter((movie) => movie.id !== id))
        setSelectedMovieId((current) => (current === id ? null : current))
      } catch {
        setError('Failed to remove movie.')
      }
    },
    [resolvedDeckId, apiFetch, isExampleDeck],
  )

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
      const good = snapScoreToStep(pointerRatioToScore(clampedX / rect.width))
      const fun = snapScoreToStep(pointerRatioToScore(1 - clampedY / rect.height))
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
      const nextGood = snapScoreToStep(pointerRatioToScore(clampedX / rect.width))
      const nextFun = snapScoreToStep(pointerRatioToScore(1 - clampedY / rect.height))
      applyMovieScores(dragging.ids, nextFun, nextGood)
    },
    [applyMovieScores],
  )

  const handleExampleMovieDelete = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    alertExampleDeckReadOnly()
  }

  const highlightFromList = useCallback((id: string) => {
    setHoverLink({ id, from: 'list' })
  }, [])

  const highlightFromGrid = useCallback((id: string) => {
    setHoverLink({ id, from: 'grid' })
  }, [])

  const clearHoverLink = useCallback(() => {
    setHoverLink(null)
  }, [])

  const selectMovie = useCallback((id: string) => {
    setSelectedMovieId(id)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedMovieId(null)
  }, [])

  const beginPendingPointer = useCallback(
    (primaryId: string, drag: DragState, event: React.PointerEvent) => {
      event.preventDefault()
      if (isExampleDeck) {
        selectMovie(primaryId)
        return
      }
      setPendingPointer({
        primaryId,
        drag,
        x: event.clientX,
        y: event.clientY,
        startedAt: performance.now(),
      })
    },
    [isExampleDeck, selectMovie],
  )

  const handlePointerDown =
    (key: string, ids: string[], primaryId: string) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return
      }
      beginPendingPointer(
        primaryId,
        { type: 'group', key, ids, origin: 'grid' },
        event,
      )
    }

  const handleLabelPointerDown =
    (id: string) => (event: React.PointerEvent<HTMLSpanElement>) => {
      event.stopPropagation()
      beginPendingPointer(
        id,
        { type: 'single', key: id, ids: [id], origin: 'grid' },
        event,
      )
    }

  const handleMovieListPointerDown =
    (id: string) => (event: React.PointerEvent<HTMLLIElement>) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('button')) {
        return
      }
      beginPendingPointer(
        id,
        { type: 'single', key: id, ids: [id], origin: 'list' },
        event,
      )
    }

  const handleGridBackgroundPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element
    if (target.closest('.movie-point') || target.closest('.grid-toolbar')) {
      return
    }
    clearSelection()
  }

  const handleSidebarBackgroundPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target as Element
    if (
      target.closest('.movie-list li') ||
      target.closest('.movie-selection-bar') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('a')
    ) {
      return
    }
    clearSelection()
  }

  useEffect(() => {
    if (!pendingPointer) {
      return
    }

    const threshold = 12
    const minHoldMs = 120
    let dragStarted = false

    const handlePointerMove = (event: PointerEvent) => {
      if (dragStarted) {
        return
      }
      if (performance.now() - pendingPointer.startedAt < minHoldMs) {
        return
      }
      const dx = event.clientX - pendingPointer.x
      const dy = event.clientY - pendingPointer.y
      if (Math.hypot(dx, dy) < threshold) {
        return
      }

      dragStarted = true
      captureDragSnapshot(pendingPointer.drag.ids)
      setPendingPointer(null)
      setDraggingGroup(pendingPointer.drag)
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      updateMoviePosition(pendingPointer.drag, event.clientX, event.clientY)
    }

    const handlePointerUp = () => {
      if (!dragStarted) {
        selectMovie(pendingPointer.primaryId)
      }
      setPendingPointer(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
    window.addEventListener('pointercancel', handlePointerUp, { once: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [captureDragSnapshot, pendingPointer, selectMovie, updateMoviePosition])

  const selectedMovie = useMemo(
    () => deckMovies.find((movie) => movie.id === selectedMovieId) ?? null,
    [deckMovies, selectedMovieId],
  )

  useEffect(() => {
    if (!selectedMovieId) {
      return
    }
    document
      .querySelector(`[data-movie-list-id="${selectedMovieId}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedMovieId])

  const handleDeleteSelected = useCallback(() => {
    if (!selectedMovieId) {
      return
    }
    void removeMovie(selectedMovieId)
  }, [removeMovie, selectedMovieId])

  const handleSelectedScoreAdjustStart = useCallback(() => {
    if (!selectedMovieId || isExampleDeck) {
      return
    }
    captureDragSnapshot([selectedMovieId])
  }, [captureDragSnapshot, isExampleDeck, selectedMovieId])

  const handleSelectedScoreCommit = useCallback(async () => {
    if (!selectedMovieId || isExampleDeck) {
      return
    }
    await persistMoviePositions([selectedMovieId])
    recordUndoIfChanged()
  }, [isExampleDeck, persistMoviePositions, recordUndoIfChanged, selectedMovieId])

  const handleSelectedFunChange = useCallback(
    (value: number) => {
      if (!selectedMovieId) {
        return
      }
      if (isExampleDeck) {
        alertExampleDeckReadOnly()
        return
      }
      updateMovieAxisScore(selectedMovieId, 'fun', value)
    },
    [isExampleDeck, selectedMovieId, updateMovieAxisScore],
  )

  const handleSelectedGoodChange = useCallback(
    (value: number) => {
      if (!selectedMovieId) {
        return
      }
      if (isExampleDeck) {
        alertExampleDeckReadOnly()
        return
      }
      updateMovieAxisScore(selectedMovieId, 'good', value)
    },
    [isExampleDeck, selectedMovieId, updateMovieAxisScore],
  )

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
        dragStartSnapshotRef.current = null
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
      recordUndoIfChanged()
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
  }, [
    applyMovieScores,
    draggingGroup,
    findSnapTarget,
    persistMoviePositions,
    recordUndoIfChanged,
    updateMoviePosition,
  ])

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        (target instanceof HTMLInputElement &&
          target.type !== 'range' &&
          target.type !== 'button'))

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (!selectedMovieId) {
          return
        }
        event.preventDefault()
        void removeMovie(selectedMovieId)
        return
      }

      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') {
        return
      }
      if (isExampleDeck) {
        return
      }

      if (event.shiftKey) {
        if (!canRedo) {
          return
        }
        event.preventDefault()
        void handleRedo()
        return
      }

      if (!canUndo) {
        return
      }
      event.preventDefault()
      void handleUndo()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    canRedo,
    canUndo,
    handleRedo,
    handleUndo,
    isExampleDeck,
    removeMovie,
    selectedMovieId,
  ])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !resolvedDeckId || isExampleDeck) {
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
    <div
      className={['deck-page-layout', isExampleDeck ? 'deck-page-layout--example' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <section className="grid-panel">
        <div
          className={['grid-wrapper', isExampleDeck ? 'grid-wrapper--example' : '']
            .filter(Boolean)
            .join(' ')}
          onPointerDown={handleGridBackgroundPointerDown}
        >
          {!isExampleDeck && (
            <div className="grid-toolbar">
              <button
                type="button"
                className="btn-undo"
                onClick={() => void handleUndo()}
                disabled={!canUndo}
                title="Undo last move (⌘Z)"
              >
                ↩ Undo
              </button>
              <button
                type="button"
                className="btn-undo"
                onClick={() => void handleRedo()}
                disabled={!canRedo}
                title="Redo last move (⌘⇧Z)"
              >
                ↪ Redo
              </button>
            </div>
          )}
          <div className="grid-axis grid-axis-y">Fun</div>
          <div className="grid-axis grid-axis-x">Good</div>
          <PlotGridZoom ref={gridRef}>
            <GridAxes />
            {ghostDeckId && <GhostPoints groups={ghostGroups} />}
            {groupedMovies.map((group) => {
              const left = scoreToPlotPercent(group.good, 'x')
              const top = scoreToPlotPercent(group.fun, 'y')
              const key = group.key
              const isDragging = draggingGroup
                ? group.ids.some((id) => draggingGroup.ids.includes(id))
                : false
              const isGridHighlighted =
                hoverLink?.from === 'list' && group.ids.includes(hoverLink.id)
              const isGridSelected =
                selectedMovieId !== null && group.ids.includes(selectedMovieId)

              return (
                <div
                  key={key}
                  className={[
                    'movie-point',
                    isDragging ? 'dragging' : '',
                    isGridSelected ? 'movie-point--selected' : '',
                    isGridHighlighted ? 'movie-point--highlighted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  onPointerDown={handlePointerDown(key, group.ids, group.items[0].id)}
                  onMouseEnter={
                    group.items.length === 1
                      ? () => highlightFromGrid(group.items[0].id)
                      : undefined
                  }
                  onMouseLeave={
                    group.items.length === 1 ? clearHoverLink : undefined
                  }
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
                        className={[
                          'movie-label-line',
                          selectedMovieId === item.id ? 'movie-label-line--selected' : '',
                          hoverLink?.from === 'list' && hoverLink.id === item.id
                            ? 'movie-label-line--linked'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span
                          className="movie-label-title"
                          data-movie-id={item.id}
                          onPointerDownCapture={handleLabelPointerDown(item.id)}
                          onMouseEnter={() => highlightFromGrid(item.id)}
                          onMouseLeave={clearHoverLink}
                        >
                          {item.title}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className="movie-point-score" aria-hidden="true">
                    Good {formatScore(group.good)} · Fun {formatScore(group.fun)}
                  </span>
                </div>
              )
            })}
          </PlotGridZoom>
        </div>
      </section>

      <div className="deck-rail">
        <aside
          className="panel deck-sidebar"
          onPointerDown={handleSidebarBackgroundPointerDown}
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

        {(otherDecks.length > 0 || ghostDeckId) && (
          <div className="deck-sidebar-section deck-sidebar-section--tools deck-sidebar-tools">
            {otherDecks.length > 0 && (
              <div className="ghost-compare-section">
                <label className="ghost-compare-label" htmlFor="ghost-deck-select">
                  Compare with
                </label>
                <div className="ghost-compare-row">
                  <select
                    id="ghost-deck-select"
                    value={ghostDeckId}
                    onChange={(e) => handleSetGhostDeck(e.target.value)}
                  >
                    <option value="">None</option>
                    {otherDecks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {ghostDeckId && (
                    <button type="button" className="btn-swap" onClick={handleSwapDecks}>
                      ⇄ Swap primary
                    </button>
                  )}
                </div>
                <p className="ghost-compare-hint">
                  Ghost deck is view-only on the grid — edit the primary deck, then swap if needed.
                </p>
              </div>
            )}
            {ghostDeckId && (
              <div className="ghost-legend">
                <span className="ghost-legend-item">
                  <span className="ghost-swatch ghost-swatch-primary" />
                  {deckName} (primary{isExampleDeck ? ', read-only' : ', editable'})
                </span>
                <span className="ghost-legend-item">
                  <span className="ghost-swatch ghost-swatch-ghost" />
                  {ghostDeckName || '…'} (ghost, read-only)
                </span>
              </div>
            )}
          </div>
        )}

        {error && <p className="error-banner">{error}</p>}
        {loading && <p className="status-line">Syncing changes…</p>}

        {!isExampleDeck && (
          <div className="deck-sidebar-section deck-sidebar-section--add">
            <h3 className="deck-sidebar-section__title">Add a movie</h3>
            <form className="movie-form movie-form--compact" onSubmit={handleSubmit}>
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
              <div className="score-sliders score-sliders--add">
                <ScoreSlider
                  label="Fun"
                  value={fun}
                  onChange={(value) => setFun(snapScoreToStep(value))}
                />
                <ScoreSlider
                  label="Good"
                  value={good}
                  onChange={(value) => setGood(snapScoreToStep(value))}
                />
              </div>
              <button type="submit">Add movie</button>
            </form>
          </div>
        )}

        {selectedMovie && (
          <div className="deck-sidebar-section movie-selection-panel">
            <div className="movie-selection-bar">
              <div className="movie-selection-info">
                <span className="movie-selection-label">Selected</span>
                <strong className="movie-selection-title" title={selectedMovie.title}>
                  {selectedMovie.title}
                </strong>
              </div>
              <button
                type="button"
                className="btn-delete-selected"
                onClick={handleDeleteSelected}
              >
                Delete
              </button>
            </div>
            <div className="score-sliders score-sliders--selected">
              <ScoreSlider
                label="Fun"
                value={selectedMovie.fun}
                disabled={isExampleDeck}
                onAdjustStart={handleSelectedScoreAdjustStart}
                onChange={handleSelectedFunChange}
                onCommit={() => void handleSelectedScoreCommit()}
              />
              <ScoreSlider
                label="Good"
                value={selectedMovie.good}
                disabled={isExampleDeck}
                onAdjustStart={handleSelectedScoreAdjustStart}
                onChange={handleSelectedGoodChange}
                onCommit={() => void handleSelectedScoreCommit()}
              />
            </div>
          </div>
        )}

        <div className="deck-sidebar-section deck-sidebar-section--list movie-list">
          <h3 className="deck-sidebar-section__title deck-sidebar-section__title--inline">
            Movies
          </h3>
          <div className="movie-list-header">
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
              <li
                key={movie.id}
                data-movie-list-id={movie.id}
                className={[
                  selectedMovieId === movie.id ? 'movie-list-item--selected' : '',
                  hoverLink?.from === 'grid' && hoverLink.id === movie.id
                    ? 'movie-list-item--highlighted'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ') || undefined}
                onPointerDown={handleMovieListPointerDown(movie.id)}
                onMouseEnter={() => highlightFromList(movie.id)}
                onMouseLeave={clearHoverLink}
              >
                <div className="movie-list-title">
                  <strong title={movie.title}>{movie.title}</strong>
                  {isExampleDeck ? (
                    <button
                      type="button"
                      className="movie-delete"
                      aria-label={`Remove ${movie.title}`}
                      onClick={handleExampleMovieDelete}
                    >
                      ×
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="movie-delete"
                      aria-label={`Remove ${movie.title}`}
                      onClick={() => removeMovie(movie.id)}
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
        </aside>
      </div>
    </div>
  )
}


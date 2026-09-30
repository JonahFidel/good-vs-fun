import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DeckSidebar } from '../components/deck/DeckSidebar'
import { GhostCompareControls } from '../components/GhostCompareControls'
import { GhostPoints } from '../components/GhostPoints'
import { GridAxes } from '../components/GridAxes'
import { MoviePoints } from '../components/MoviePoints'
import { PlotGridZoom } from '../components/PlotGridZoom'
import { useGhostDeck } from '../hooks/useGhostDeck'
import { useMoveHistory } from '../hooks/useMoveHistory'
import { usePlotDrag } from '../hooks/usePlotDrag'
import { useApiFetch } from '../lib/api'
import { alertExampleDeckReadOnly } from '../lib/exampleDeck'
import { formatTitle, snapScoreToStep } from '../lib/format'
import { groupByPosition } from '../lib/groupByPosition'
import type { Deck, Movie } from '../lib/types'

export function DeckPage() {
  const { deckId } = useParams()
  const apiFetch = useApiFetch()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const resolvedDeckId = typeof deckId === 'string' ? deckId : null
  const ghostDeckId = searchParams.get('ghost') ?? ''
  const ghost2DeckId = searchParams.get('ghost2') ?? ''

  const [deckName, setDeckName] = useState<string>('')
  const [isExampleDeck, setIsExampleDeck] = useState(false)
  const [deckMovies, setDeckMovies] = useState<Movie[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [allDecks, setAllDecks] = useState<Deck[]>([])
  const { movies: ghostMovies, name: ghostDeckName } = useGhostDeck(ghostDeckId)
  const { movies: ghost2Movies, name: ghost2DeckName } = useGhostDeck(ghost2DeckId)

  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [hoverLink, setHoverLink] = useState<{
    id: string
    from: 'grid' | 'list'
  } | null>(null)

  const moviesRef = useRef<Movie[]>([])
  const {
    canUndo,
    canRedo,
    captureDragSnapshot,
    discardDragSnapshot,
    recordUndoIfChanged,
    undo,
    redo,
  } = useMoveHistory({
    deckId: resolvedDeckId,
    isExampleDeck,
    moviesRef,
    setMovies: setDeckMovies,
    setError,
  })

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

  const ghostGroups = useMemo(() => groupByPosition(ghostMovies), [ghostMovies])
  const ghost2Groups = useMemo(() => groupByPosition(ghost2Movies), [ghost2Movies])
  const movieGroups = useMemo(() => groupByPosition(deckMovies), [deckMovies])
  const otherDecks = useMemo(
    () => allDecks.filter((d) => d.id !== resolvedDeckId),
    [allDecks, resolvedDeckId],
  )

  function writeGhostParams(nextGhost: string, nextGhost2: string) {
    const params = new URLSearchParams()
    if (nextGhost) params.set('ghost', nextGhost)
    if (nextGhost2) params.set('ghost2', nextGhost2)
    setSearchParams(params, { replace: true })
  }

  function handleSetGhostDeck(id: string) {
    // Don't allow the same deck in both ghost slots
    const nextGhost2 = id && id === ghost2DeckId ? '' : ghost2DeckId
    writeGhostParams(id, nextGhost2)
  }

  function handleSetGhost2Deck(id: string) {
    const nextGhost = id && id === ghostDeckId ? '' : ghostDeckId
    writeGhostParams(nextGhost, id)
  }

  function handleSwapDecks(withGhost: 1 | 2 = 1) {
    if (!resolvedDeckId) return
    const swapId = withGhost === 1 ? ghostDeckId : ghost2DeckId
    if (!swapId) return
    const params = new URLSearchParams()
    if (withGhost === 1) {
      params.set('ghost', resolvedDeckId)
      if (ghost2DeckId) params.set('ghost2', ghost2DeckId)
    } else {
      if (ghostDeckId) params.set('ghost', ghostDeckId)
      params.set('ghost2', resolvedDeckId)
    }
    const qs = params.toString()
    navigate(`/deck/${swapId}/movies${qs ? `?${qs}` : ''}`)
  }

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

  const {
    gridRef,
    draggingIds,
    handlePointerDown,
    handleLabelPointerDown,
    handleMovieListPointerDown,
  } = usePlotDrag({
    isExampleDeck,
    moviesRef,
    setMovies: setDeckMovies,
    persistMoviePositions,
    captureDragSnapshot,
    discardDragSnapshot,
    recordUndoIfChanged,
    onSelectMovie: selectMovie,
  })

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

  const handleDeleteSelected = useCallback(() => {
    if (!selectedMovieId) {
      return
    }
    void removeMovie(selectedMovieId)
  }, [removeMovie, selectedMovieId])

  const handleRenameSelected = useCallback(async () => {
    if (!selectedMovieId || !resolvedDeckId) {
      return
    }
    if (isExampleDeck) {
      alertExampleDeckReadOnly()
      return
    }

    const current = moviesRef.current.find((movie) => movie.id === selectedMovieId)
    if (!current) {
      return
    }

    const nextTitle = window.prompt('Rename movie', current.title)
    if (!nextTitle) {
      return
    }

    const formattedTitle = formatTitle(nextTitle.trim())
    if (!formattedTitle || formattedTitle === current.title) {
      return
    }

    setError(null)
    try {
      await apiFetch(`/api/decks/${resolvedDeckId}/movies/${selectedMovieId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: formattedTitle,
          fun: current.fun,
          good: current.good,
        }),
      })
      setDeckMovies((movies) =>
        movies.map((movie) =>
          movie.id === selectedMovieId ? { ...movie, title: formattedTitle } : movie,
        ),
      )
    } catch {
      setError('Failed to rename movie.')
    }
  }, [apiFetch, isExampleDeck, resolvedDeckId, selectedMovieId])

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
        void redo()
        return
      }

      if (!canUndo) {
        return
      }
      event.preventDefault()
      void undo()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    canRedo,
    canUndo,
    redo,
    undo,
    isExampleDeck,
    removeMovie,
    selectedMovieId,
  ])

  const handleAddMovie = useCallback(
    async (movie: { title: string; fun: number; good: number }) => {
      if (!resolvedDeckId || isExampleDeck) {
        return false
      }

      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch(`/api/decks/${resolvedDeckId}/movies`, {
          method: 'POST',
          body: JSON.stringify(movie),
        })
        if (data?.movie) {
          setDeckMovies((current) => [...current, data.movie as Movie])
          return true
        }
        return false
      } catch {
        setError('Failed to add movie.')
        return false
      } finally {
        setLoading(false)
      }
    },
    [apiFetch, isExampleDeck, resolvedDeckId],
  )

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
                onClick={() => void undo()}
                disabled={!canUndo}
                title="Undo last move (⌘Z)"
              >
                ↩ Undo
              </button>
              <button
                type="button"
                className="btn-undo"
                onClick={() => void redo()}
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
            {ghostDeckId && <GhostPoints groups={ghostGroups} variant={1} />}
            {ghost2DeckId && <GhostPoints groups={ghost2Groups} variant={2} />}
            <MoviePoints
              groups={movieGroups}
              draggingIds={draggingIds}
              selectedMovieId={selectedMovieId}
              hover={hoverLink}
              onGroupPointerDown={handlePointerDown}
              onLabelPointerDown={handleLabelPointerDown}
              onHighlight={highlightFromGrid}
              onClearHover={clearHoverLink}
            />
          </PlotGridZoom>
        </div>
      </section>

      <div className="deck-rail">
        <DeckSidebar
          deckName={deckName}
          isExampleDeck={isExampleDeck}
          error={error}
          loading={loading}
          movies={deckMovies}
          selectedMovieId={selectedMovieId}
          hover={hoverLink}
          onBackgroundPointerDown={handleSidebarBackgroundPointerDown}
          onAddMovie={handleAddMovie}
          onRenameSelected={() => void handleRenameSelected()}
          onDeleteSelected={handleDeleteSelected}
          onScoreAdjustStart={handleSelectedScoreAdjustStart}
          onFunChange={handleSelectedFunChange}
          onGoodChange={handleSelectedGoodChange}
          onScoreCommit={() => void handleSelectedScoreCommit()}
          onMoviePointerDown={handleMovieListPointerDown}
          onHighlightFromList={highlightFromList}
          onClearHover={clearHoverLink}
          onRemoveMovie={(id) => void removeMovie(id)}
        >
          <GhostCompareControls
            primaryName={deckName}
            primaryIsExample={isExampleDeck}
            otherDecks={otherDecks}
            ghostDeckId={ghostDeckId}
            ghost2DeckId={ghost2DeckId}
            ghostDeckName={ghostDeckName}
            ghost2DeckName={ghost2DeckName}
            onGhostDeckChange={handleSetGhostDeck}
            onGhost2DeckChange={handleSetGhost2Deck}
            onSwap={handleSwapDecks}
          />
        </DeckSidebar>
      </div>
    </div>
  )
}


import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react'
import {
  closestMovieId,
  movieIdAtVisibleLabel,
  MOVIE_HIT_RADIUS_PX,
  nextMovieIdInGroup,
  pointerHitsVisibleMovieLabel,
} from '../../lib/closestMoviePoint'
import { snapScoreToStep } from '../../lib/format'
import { scoresAtPointer } from '../../lib/findSnapTarget'
import type { Movie } from '../../lib/types'
import { useHoldToDrag, type PlotDrag } from './useHoldToDrag'
import { usePlotDragSession } from './usePlotDragSession'

type Score = {
  fun: number
  good: number
}

export function usePlotDrag({
  isExampleDeck,
  moviesRef,
  setMovies,
  persistMoviePositions,
  captureDragSnapshot,
  discardDragSnapshot,
  recordUndoIfChanged,
  selectedMovieId,
  onSelectMovie,
}: {
  isExampleDeck: boolean
  moviesRef: { current: Movie[] }
  setMovies: Dispatch<SetStateAction<Movie[]>>
  persistMoviePositions: (ids: string[], override?: Score) => void
  captureDragSnapshot: (ids: string[]) => void
  discardDragSnapshot: () => void
  recordUndoIfChanged: () => void
  selectedMovieId: string | null
  onSelectMovie: (id: string) => void
}) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [draggingGroup, setDraggingGroup] = useState<PlotDrag | null>(null)

  const applyMovieScores = useCallback(
    (ids: string[], fun: number, good: number) => {
      const nextFun = snapScoreToStep(fun)
      const nextGood = snapScoreToStep(good)
      const idSet = new Set(ids)

      setMovies((current) => {
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
    },
    [moviesRef, setMovies],
  )

  const updateMoviePosition = useCallback(
    (dragging: PlotDrag, clientX: number, clientY: number) => {
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

      const { fun, good } = scoresAtPointer(grid, clientX, clientY)
      applyMovieScores(dragging.ids, fun, good)
    },
    [applyMovieScores],
  )

  const endDrag = useCallback(() => {
    setDraggingGroup(null)
  }, [])

  const { notePointer } = usePlotDragSession({
    dragging: draggingGroup,
    gridRef,
    moviesRef,
    updateMoviePosition,
    applyMovieScores,
    persistMoviePositions,
    discardDragSnapshot,
    recordUndoIfChanged,
    onDragEnd: endDrag,
  })

  const startDrag = useCallback(
    (drag: PlotDrag, point: { x: number; y: number }) => {
      captureDragSnapshot(drag.ids)
      setDraggingGroup(drag)
      notePointer(point)
      updateMoviePosition(drag, point.x, point.y)
    },
    [captureDragSnapshot, notePointer, updateMoviePosition],
  )

  const { beginPendingPointer } = useHoldToDrag({
    isExampleDeck,
    onSelectMovie,
    onDragStart: startDrag,
  })

  // Capture-phase so a tap on overlapping 44px rings selects the nearest
  // dot, not whichever .movie-point is later in the DOM. Stop the event so
  // the topmost ring's React handler cannot select a farther movie.
  useEffect(() => {
    if (!gridRef.current) {
      return
    }
    const plot: HTMLElement = gridRef.current

    function onTouchSelect(event: PointerEvent) {
      // After double-tap / deep pinch, titles are visible but
      // pointer-events: none. Prefer the painted title so a tap on
      // "Kill Bill" selects that movie instead of a nearby 44px ring
      // or cycling the stack. Overlapping pills keep the selected title
      // (it is painted on top). Below label zoom, keep marker-first so
      // a selected pill does not steal taps aimed at a covered neighbor.
      const zoomed = Boolean(plot.closest('.grid-zoom-slot--labels'))
      // PlotGridZoom writes this when tap-A-then-tap-B overshoots the
      // stacked pill inside the double-tap window: the follow-up is
      // outside movieIdAtVisibleLabel, and closestMovieId would cycle
      // the shared marker. A later tap, a neighboring 44px ring, or
      // marker jitter in this stack's ring must not inherit that id.
      // A pointer actually on the other listed title still writes it,
      // even inside this 44px ring: the inner ~7px of a 2.2x name sits
      // there, and right-side labels put the start of that title there.
      // A miss in the 0.2rem gap is the same inner slice without a
      // title box, so in-pill closest-name still writes it.
      const stackedRetargetId = plot.dataset.stackedRetargetId
      if (stackedRetargetId) {
        delete plot.dataset.stackedRetargetId
      }
      const fromLabel = zoomed
        ? stackedRetargetId ||
          movieIdAtVisibleLabel(plot, event.clientX, event.clientY)
        : null
      // Compare overlay names have no movie id and pointer-events none,
      // so a tap on a ghost title at 3.2x would otherwise fall through
      // to a nearby primary 44px ring (touch) or the marker under the
      // pill (mouse) and switch the selected movie while you are
      // reading the overlay. Stop the event so the React marker
      // handler cannot select either. Fit-zoom selected pills stay
      // marker-first: this skip is zoomed-only, matching fromLabel.
      if (
        zoomed &&
        !fromLabel &&
        pointerHitsVisibleMovieLabel(plot, event.clientX, event.clientY)
      ) {
        event.stopPropagation()
        return
      }
      if (event.pointerType !== 'touch') {
        return
      }
      const id =
        fromLabel ??
        closestMovieId(
          plot,
          event.clientX,
          event.clientY,
          MOVIE_HIT_RADIUS_PX,
          selectedMovieId,
        )
      if (!id) {
        return
      }
      event.stopPropagation()
      onSelectMovie(id)
    }

    plot.addEventListener('pointerdown', onTouchSelect, { capture: true })
    return () => {
      plot.removeEventListener('pointerdown', onTouchSelect, { capture: true })
    }
  }, [onSelectMovie, selectedMovieId])

  const handlePointerDown =
    (key: string, ids: string[], primaryId: string) =>
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return
      }
      // Hold-to-drag on the grid is a mouse gesture. On touch it preventDefaults
      // and, after 120ms, steals one-finger pan once the plot is zoomed. Tap
      // to select; Fun/Good still edit from the Selected sliders.
      if (event.pointerType !== 'mouse') {
        onSelectMovie(nextMovieIdInGroup(ids, selectedMovieId) ?? primaryId)
        return
      }
      beginPendingPointer(
        primaryId,
        { type: 'group', key, ids, origin: 'grid' },
        event,
      )
    }

  const handleLabelPointerDown =
    (id: string) => (event: ReactPointerEvent<HTMLSpanElement>) => {
      event.stopPropagation()
      if (event.pointerType !== 'mouse') {
        onSelectMovie(id)
        return
      }
      beginPendingPointer(
        id,
        { type: 'single', key: id, ids: [id], origin: 'grid' },
        event,
      )
    }

  const handleMovieListPointerDown =
    (id: string) => (event: ReactPointerEvent<HTMLLIElement>) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('button')) {
        return
      }
      // Hold-to-drag preventDefault on pointerdown steals iPhone sidebar
      // scroll. List-to-grid drag is a mouse gesture; touch taps select
      // via click instead.
      if (event.pointerType !== 'mouse') {
        return
      }
      beginPendingPointer(
        id,
        { type: 'single', key: id, ids: [id], origin: 'list' },
        event,
      )
    }

  return {
    gridRef,
    draggingIds: draggingGroup?.ids ?? null,
    handlePointerDown,
    handleLabelPointerDown,
    handleMovieListPointerDown,
  }
}

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { snapScoreToStep } from '../lib/format'
import { pointerRatioToScore } from '../lib/gridCanvas'
import type { Movie } from '../lib/types'

type DragState = {
  type: 'group' | 'single'
  key: string
  ids: string[]
  origin: 'grid' | 'list'
}

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
  onSelectMovie,
}: {
  isExampleDeck: boolean
  moviesRef: { current: Movie[] }
  setMovies: Dispatch<SetStateAction<Movie[]>>
  persistMoviePositions: (ids: string[], override?: Score) => void
  captureDragSnapshot: (ids: string[]) => void
  discardDragSnapshot: () => void
  recordUndoIfChanged: () => void
  onSelectMovie: (id: string) => void
}) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const lastInGridPointerRef = useRef<{ x: number; y: number } | null>(null)
  const [draggingGroup, setDraggingGroup] = useState<DragState | null>(null)
  const [pendingPointer, setPendingPointer] = useState<{
    primaryId: string
    drag: DragState
    x: number
    y: number
    startedAt: number
  } | null>(null)

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
    [moviesRef],
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

  const beginPendingPointer = useCallback(
    (primaryId: string, drag: DragState, event: React.PointerEvent) => {
      event.preventDefault()
      if (isExampleDeck) {
        onSelectMovie(primaryId)
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
    [isExampleDeck, onSelectMovie],
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
        onSelectMovie(pendingPointer.primaryId)
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
  }, [captureDragSnapshot, onSelectMovie, pendingPointer, updateMoviePosition])

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
        discardDragSnapshot()
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
    discardDragSnapshot,
    draggingGroup,
    findSnapTarget,
    persistMoviePositions,
    recordUndoIfChanged,
    updateMoviePosition,
  ])

  return {
    gridRef,
    draggingIds: draggingGroup?.ids ?? null,
    handlePointerDown,
    handleLabelPointerDown,
    handleMovieListPointerDown,
  }
}

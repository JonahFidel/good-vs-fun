import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Movie = {
  id: string
  title: string
  fun: number
  good: number
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
  const [movies, setMovies] = useState<Movie[]>([
    { id: 'kill-bill-vol-1', title: 'Kill Bill Vol. 1', fun: 10, good: 8 },
  ])
  const [title, setTitle] = useState('')
  const [fun, setFun] = useState(7)
  const [good, setGood] = useState(7)
  const [draggingGroup, setDraggingGroup] = useState<{
    key: string
    ids: string[]
  } | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  const sortedMovies = useMemo(
    () => [...movies].sort((a, b) => a.title.localeCompare(b.title)),
    [movies],
  )
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

    movies.forEach((movie) => {
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
  }, [movies])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      return
    }

    const nextMovie: Movie = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: formatTitle(trimmedTitle),
      fun: clampScore(fun),
      good: clampScore(good),
    }

    setMovies((current) => [...current, nextMovie])
    setTitle('')
  }

  const updateMoviePosition = useCallback(
    (ids: string[], clientX: number, clientY: number) => {
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
      setMovies((current) =>
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
    },
    [],
  )

  const removeMovie = (id: string) => {
    setMovies((current) => current.filter((movie) => movie.id !== id))
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
  }, [draggingGroup, updateMoviePosition])

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
            {sortedMovies.length > 0 && <h3>Movies on the grid</h3>}
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
        </section>

        <section className="grid-panel">
          <div className="grid-header">
            <h2>Fun vs. Good</h2>
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

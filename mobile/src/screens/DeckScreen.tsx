import {
  deckMoviePath,
  deckMoviesPath,
  deckPath,
  formatScore,
  type Movie,
  snapScoreToStep,
} from '@good-vs-fun/shared'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GhostCompare } from '@/components/GhostCompare'
import { MoviePlot, type PlotLegend } from '@/components/MoviePlot'
import { ScoreSlider } from '@/components/ScoreSlider'
import { useApiFetch } from '@/lib/api'
import { formatTitle, formattedMovieTitle } from '@/lib/formatTitle'
import {
  applyPositions,
  scoreMoveFromSnapshot,
  snapshotPositions,
  type MoviePosition,
  type ScoreMove,
} from '@/lib/moveHistory'
import { useGhostCompare } from '@/lib/useGhostCompare'
import { colors, radii } from '@/theme'

const EXAMPLE_DECK_ALERT =
  'Example decks are read-only. Create your own deck to add, rename, move, or remove movies.'

type MovieSort = 'title' | 'fun' | 'good'

type DeckDetailResponse = {
  deck?: {
    name?: string
    isExample?: boolean
  }
  movies?: Movie[]
}

type MovieResponse = {
  movie?: Movie
}

export function DeckScreen({
  deckId,
  initialGhostId = '',
  initialGhost2Id = '',
}: {
  deckId: string
  initialGhostId?: string
  initialGhost2Id?: string
}) {
  const router = useRouter()
  const apiFetch = useApiFetch()
  const [deckName, setDeckName] = useState('')
  const [isExampleDeck, setIsExampleDeck] = useState(false)
  const [movies, setMovies] = useState<Movie[]>([])
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [sort, setSort] = useState<MovieSort>('title')
  const [title, setTitle] = useState('')
  const [fun, setFun] = useState(5)
  const [good, setGood] = useState(5)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const moviesRef = useRef<Movie[]>([])
  moviesRef.current = movies
  const dragSnapshotRef = useRef<MoviePosition[] | null>(null)
  const lastMoveRef = useRef<ScoreMove | null>(null)
  const scoreWriteRef = useRef(Promise.resolve())
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const ghost = useGhostCompare(deckId, initialGhostId, initialGhost2Id)
  const plotLegend = useMemo<PlotLegend | null>(() => {
    if (!ghost.ghostDeckId && !ghost.ghost2DeckId) {
      return null
    }
    const primaryRole = isExampleDeck ? 'read-only' : 'editable'
    return {
      primary: `${deckName || 'This deck'} (primary, ${primaryRole})`,
      ghost: ghost.ghostDeckId
        ? `${ghost.ghostDeckName || '…'} (read-only)`
        : undefined,
      ghost2: ghost.ghost2DeckId
        ? `${ghost.ghost2DeckName || '…'} (read-only)`
        : undefined,
    }
  }, [
    deckName,
    ghost.ghost2DeckId,
    ghost.ghost2DeckName,
    ghost.ghostDeckId,
    ghost.ghostDeckName,
    isExampleDeck,
  ])

  const loadDeck = useCallback(async () => {
    setError(null)
    try {
      const data = (await apiFetch(deckPath(deckId))) as DeckDetailResponse | null
      setDeckName(String(data?.deck?.name ?? ''))
      setIsExampleDeck(Boolean(data?.deck?.isExample))
      const nextMovies = data?.movies ?? []
      moviesRef.current = nextMovies
      setMovies(nextMovies)
    } catch {
      setError('Failed to load deck.')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, deckId])

  useEffect(() => {
    dragSnapshotRef.current = null
    lastMoveRef.current = null
    setCanUndo(false)
    setCanRedo(false)
  }, [deckId])

  useEffect(() => {
    void loadDeck()
  }, [loadDeck])

  const captureMoveSnapshot = (ids: string[]) => {
    if (isExampleDeck) {
      return
    }
    dragSnapshotRef.current = snapshotPositions(moviesRef.current, ids)
  }

  const recordMoveIfChanged = () => {
    const before = dragSnapshotRef.current
    dragSnapshotRef.current = null
    const move = scoreMoveFromSnapshot(before, moviesRef.current)
    if (!move) {
      return
    }
    lastMoveRef.current = move
    setCanUndo(true)
    setCanRedo(false)
  }

  const putMovieScore = (movie: {
    id: string
    title: string
    fun: number
    good: number
  }) => {
    const write = () =>
      apiFetch(deckMoviePath(deckId, movie.id), {
        method: 'PUT',
        body: JSON.stringify({
          title: movie.title,
          fun: movie.fun,
          good: movie.good,
        }),
      })
    const next = scoreWriteRef.current.then(write, write)
    scoreWriteRef.current = next.then(() => undefined, () => undefined)
    return next
  }

  const applyScoreMove = async (positions: MoviePosition[], errorMessage: string) => {
    if (isExampleDeck) {
      return false
    }

    setError(null)
    const nextMovies = applyPositions(moviesRef.current, positions)
    moviesRef.current = nextMovies
    setMovies(nextMovies)

    try {
      await Promise.all(
        positions.map((position) => {
          const current = moviesRef.current.find((item) => item.id === position.id)
          return putMovieScore({
            id: position.id,
            title: current?.title ?? '',
            fun: position.fun,
            good: position.good,
          })
        }),
      )
      return true
    } catch {
      setError(errorMessage)
      return false
    }
  }

  const undoMove = async () => {
    const entry = lastMoveRef.current
    if (!entry || !canUndo) {
      return
    }
    const ok = await applyScoreMove(entry.before, 'Failed to undo move.')
    if (ok) {
      setCanUndo(false)
      setCanRedo(true)
    }
  }

  const redoMove = async () => {
    const entry = lastMoveRef.current
    if (!entry || !canRedo) {
      return
    }
    const ok = await applyScoreMove(entry.after, 'Failed to redo move.')
    if (ok) {
      setCanUndo(true)
      setCanRedo(false)
    }
  }

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

  const selectedMovie =
    movies.find((movie) => movie.id === selectedMovieId) ?? null

  const replaceMovie = (id: string, patch: Partial<Movie>) => {
    const nextMovies = moviesRef.current.map((movie) =>
      movie.id === id ? { ...movie, ...patch } : movie,
    )
    moviesRef.current = nextMovies
    setMovies(nextMovies)
  }

  const persistMovie = async (movie: Movie) => {
    if (isExampleDeck) {
      return
    }

    try {
      await putMovieScore(movie)
    } catch {
      setError('Failed to save movie positions.')
    }
  }

  const updateScore = (key: 'fun' | 'good', value: number) => {
    if (!selectedMovie || isExampleDeck) {
      return
    }
    replaceMovie(selectedMovie.id, { [key]: value })
  }

  const commitScore = (key: 'fun' | 'good', value: number) => {
    if (!selectedMovie || isExampleDeck) {
      return
    }
    const movie = moviesRef.current.find((item) => item.id === selectedMovie.id)
    if (!movie) {
      return
    }
    void persistMovie({ ...movie, [key]: value })
  }

  const renameMovie = async (movie: Movie, nextTitle: string | undefined) => {
    const formattedTitle = formattedMovieTitle(movie.title, nextTitle)
    if (!formattedTitle || isExampleDeck) {
      return
    }

    setError(null)
    try {
      await putMovieScore({
        id: movie.id,
        title: formattedTitle,
        fun: movie.fun,
        good: movie.good,
      })
      replaceMovie(movie.id, { title: formattedTitle })
    } catch {
      setError('Failed to rename movie.')
    }
  }

  const promptRename = (movie: Movie) => {
    if (isExampleDeck) {
      Alert.alert('Example deck', EXAMPLE_DECK_ALERT)
      return
    }

    Alert.prompt(
      'Rename movie',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (value?: string) => {
            const current = moviesRef.current.find((item) => item.id === movie.id) ?? movie
            void renameMovie(current, value)
          },
        },
      ],
      'plain-text',
      movie.title,
    )
  }

  const removeMovie = async (movie: Movie) => {
    if (isExampleDeck) {
      Alert.alert('Example deck', EXAMPLE_DECK_ALERT)
      return
    }

    setError(null)
    try {
      await apiFetch(deckMoviePath(deckId, movie.id), { method: 'DELETE' })
      const nextMovies = moviesRef.current.filter((item) => item.id !== movie.id)
      moviesRef.current = nextMovies
      setMovies(nextMovies)
      setSelectedMovieId((current) => (current === movie.id ? null : current))
    } catch {
      setError('Failed to remove movie.')
    }
  }

  const addMovie = async () => {
    if (isExampleDeck) {
      Alert.alert('Example deck', EXAMPLE_DECK_ALERT)
      return
    }

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      return
    }

    setError(null)
    try {
      const data = (await apiFetch(deckMoviesPath(deckId), {
        method: 'POST',
        body: JSON.stringify({
          title: formatTitle(trimmedTitle),
          fun: snapScoreToStep(fun),
          good: snapScoreToStep(good),
        }),
      })) as MovieResponse | null
      if (data?.movie) {
        const nextMovies = [...moviesRef.current, data.movie]
        moviesRef.current = nextMovies
        setMovies(nextMovies)
        setTitle('')
      }
    } catch {
      setError('Failed to add movie.')
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.replace('/')
            }
          }}
        >
          <Text style={styles.backLabel}>← Decks</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>
            {isExampleDeck ? 'Example deck' : 'Deck'}
          </Text>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {deckName || 'Loading…'}
            </Text>
            {isExampleDeck ? <Text style={styles.badge}>Example</Text> : null}
          </View>
        </View>
      </View>

      <FlatList
        data={sortedMovies}
        extraData={selectedMovieId}
        keyExtractor={(movie) => movie.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.intro}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <MoviePlot
              movies={movies}
              selectedMovieId={selectedMovieId}
              onSelect={setSelectedMovieId}
              pending={loading && deckName === ''}
              ghostMovies={ghost.ghostMovies}
              ghost2Movies={ghost.ghost2Movies}
              legend={plotLegend}
              editable={!isExampleDeck}
              undo={
                !isExampleDeck && deckName !== ''
                  ? {
                      canUndo,
                      canRedo,
                      onUndo: () => {
                        void undoMove()
                      },
                      onRedo: () => {
                        void redoMove()
                      },
                    }
                  : null
              }
              onMoveStart={captureMoveSnapshot}
              onMove={(ids, nextFun, nextGood) => {
                const idSet = new Set(ids)
                const nextMovies = moviesRef.current.map((movie) =>
                  idSet.has(movie.id) ? { ...movie, fun: nextFun, good: nextGood } : movie,
                )
                moviesRef.current = nextMovies
                setMovies(nextMovies)
              }}
              onMoveEnd={(ids) => {
                recordMoveIfChanged()
                const idSet = new Set(ids)
                for (const movie of moviesRef.current) {
                  if (idSet.has(movie.id)) {
                    void persistMovie(movie)
                  }
                }
              }}
            />
            <GhostCompare
              decksLoaded={ghost.decksLoaded}
              otherDecks={ghost.otherDecks}
              ghostDeckId={ghost.ghostDeckId}
              ghost2DeckId={ghost.ghost2DeckId}
              ghostDeckName={ghost.ghostDeckName}
              ghost2DeckName={ghost.ghost2DeckName}
              onGhostDeckChange={ghost.setGhost}
              onGhost2DeckChange={ghost.setGhost2}
              onSwap={ghost.swap}
            />

            {selectedMovie ? (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Selected</Text>
                <View style={styles.selectedHeader}>
                  <Text style={styles.selectedTitle}>{selectedMovie.title}</Text>
                  <View style={styles.selectedActions}>
                    {isExampleDeck ? null : (
                      <Pressable
                        onPress={() => promptRename(selectedMovie)}
                        accessibilityLabel={`Rename ${selectedMovie.title}`}
                      >
                        <Text style={styles.renameLabel}>Rename</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => void removeMovie(selectedMovie)}
                      accessibilityLabel={`Delete ${selectedMovie.title}`}
                    >
                      <Text style={styles.deleteLabel}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.sliderRow}>
                  <ScoreSlider
                    label="Fun"
                    value={selectedMovie.fun}
                    disabled={isExampleDeck}
                    onAdjustStart={() => captureMoveSnapshot([selectedMovie.id])}
                    onChange={(value) => updateScore('fun', value)}
                    onCommit={(value) => {
                      commitScore('fun', value)
                      recordMoveIfChanged()
                    }}
                  />
                  <ScoreSlider
                    label="Good"
                    value={selectedMovie.good}
                    disabled={isExampleDeck}
                    onAdjustStart={() => captureMoveSnapshot([selectedMovie.id])}
                    onChange={(value) => updateScore('good', value)}
                    onCommit={(value) => {
                      commitScore('good', value)
                      recordMoveIfChanged()
                    }}
                  />
                </View>
              </View>
            ) : null}

            {isExampleDeck ? (
              <Text style={styles.note}>{EXAMPLE_DECK_ALERT}</Text>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Add a movie</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Jurassic Park"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
                <View style={styles.sliderRow}>
                  <ScoreSlider label="Fun" value={fun} onChange={setFun} />
                  <ScoreSlider label="Good" value={good} onChange={setGood} />
                </View>
                <Pressable style={styles.addButton} onPress={() => void addMovie()}>
                  <Text style={styles.addLabel}>Add movie</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.sortRow}>
              <Text style={styles.sectionTitle}>Movies</Text>
              <View style={styles.sortOptions}>
                {(['title', 'fun', 'good'] as const).map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.sortChip, sort === option && styles.sortChipActive]}
                    onPress={() => setSort(option)}
                  >
                    <Text
                      style={[
                        styles.sortChipLabel,
                        sort === option && styles.sortChipLabelActive,
                      ]}
                    >
                      {option === 'title' ? 'Title' : option === 'fun' ? 'Fun' : 'Good'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.heading} />
          ) : (
            <Text style={styles.empty}>No movies yet.</Text>
          )
        }
        renderItem={({ item }) => {
          const selected = item.id === selectedMovieId
          return (
            <Pressable
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => setSelectedMovieId(item.id)}
            >
              <View style={styles.rowTitle}>
                <Text style={styles.movieTitle}>{item.title}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => void removeMovie(item)}
                  accessibilityLabel={`Remove ${item.title}`}
                >
                  <Text style={styles.remove}>×</Text>
                </Pressable>
              </View>
              <Text style={styles.scores}>
                F {formatScore(item.fun)} · G {formatScore(item.good)}
              </Text>
            </Pressable>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    alignSelf: 'flex-start',
  },
  backLabel: {
    color: colors.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  titleBlock: {
    gap: 2,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
    color: colors.heading,
    fontSize: 24,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.exampleSurface,
    color: colors.exampleText,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  intro: {
    gap: 12,
    marginBottom: 4,
  },
  error: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSurface,
    color: colors.danger,
    fontWeight: '600',
  },
  note: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    gap: 10,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  sliderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.heading,
  },
  addLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectedTitle: {
    flex: 1,
    color: colors.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  selectedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  renameLabel: {
    color: colors.heading,
    fontWeight: '700',
  },
  deleteLabel: {
    color: colors.danger,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortChipActive: {
    backgroundColor: colors.heading,
    borderColor: colors.heading,
  },
  sortChipLabel: {
    color: colors.heading,
    fontSize: 12,
    fontWeight: '700',
  },
  sortChipLabelActive: {
    color: '#ffffff',
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  row: {
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: {
    borderColor: colors.heading,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  movieTitle: {
    flex: 1,
    color: colors.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  remove: {
    color: colors.muted,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },
  scores: {
    color: colors.muted,
    fontWeight: '600',
  },
})

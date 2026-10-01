import { useClerk } from '@clerk/expo'
import { ApiRoute, deckPath, type Deck } from '@good-vs-fun/shared'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useApiFetch } from '@/lib/api'
import { sortDecks, type DeckSort } from '@/lib/deckOrder'
import { formatTitle } from '@/lib/formatTitle'
import { colors, radii } from '@/theme'

type DecksResponse = {
  decks?: Deck[]
}

type DeckResponse = {
  deck?: Deck
}

type RenameResponse = {
  deck?: {
    name?: string
    updatedAt?: string
  }
}

const SORT_OPTIONS: { id: DeckSort; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'name', label: 'Name' },
  { id: 'count', label: 'Count' },
]

export function DecksScreen() {
  const router = useRouter()
  const apiFetch = useApiFetch()
  const { signOut } = useClerk()
  const [decks, setDecks] = useState<Deck[]>([])
  const [deckName, setDeckName] = useState('')
  const [deckSort, setDeckSort] = useState<DeckSort>('recent')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const sortedDecks = useMemo(() => sortDecks(decks, deckSort), [decks, deckSort])

  const loadDecks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = (await apiFetch(ApiRoute.decks)) as DecksResponse | null
      setDecks(data?.decks ?? [])
    } catch {
      setError('Failed to load decks.')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void loadDecks()
  }, [loadDecks])

  const createDeck = async () => {
    const trimmedName = deckName.trim()
    if (!trimmedName) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = (await apiFetch(ApiRoute.decks, {
        method: 'POST',
        body: JSON.stringify({ name: formatTitle(trimmedName) }),
      })) as DeckResponse | null
      if (data?.deck) {
        setDecks((current) => {
          const examples = current.filter((deck) => deck.isExample)
          const userDecks = current.filter((deck) => !deck.isExample)
          return [...examples, data.deck as Deck, ...userDecks]
        })
        setDeckName('')
      }
    } catch {
      setError('Failed to create deck.')
    } finally {
      setLoading(false)
    }
  }

  const renameDeck = async (deck: Deck, nextName: string | undefined) => {
    const trimmedName = nextName?.trim() ?? ''
    if (!trimmedName || deck.isExample) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const formattedName = formatTitle(trimmedName)
      const data = (await apiFetch(deckPath(deck.id), {
        method: 'PUT',
        body: JSON.stringify({ name: formattedName }),
      })) as RenameResponse | null
      setDecks((current) =>
        current.map((item) =>
          item.id === deck.id
            ? {
                ...item,
                name: data?.deck?.name ?? formattedName,
                updatedAt: data?.deck?.updatedAt ?? item.updatedAt,
              }
            : item,
        ),
      )
    } catch {
      setError('Failed to rename deck.')
    } finally {
      setLoading(false)
    }
  }

  const promptRename = (deck: Deck) => {
    if (deck.isExample) {
      return
    }

    Alert.prompt(
      'Rename deck',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (value?: string) => {
            void renameDeck(deck, value)
          },
        },
      ],
      'plain-text',
      deck.name,
    )
  }

  const deleteDeck = async (deck: Deck) => {
    if (deck.isExample) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      await apiFetch(deckPath(deck.id), { method: 'DELETE' })
      setDecks((current) => current.filter((item) => item.id !== deck.id))
    } catch {
      setError('Failed to delete deck.')
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (deck: Deck) => {
    if (deck.isExample) {
      return
    }

    Alert.alert(
      'Delete deck',
      `Delete "${deck.name}" and its movies? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteDeck(deck)
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.brand}>Good vs. Fun</Text>
        <Pressable style={styles.signOut} onPress={() => void signOut()}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </View>

      <FlatList
        data={sortedDecks}
        keyExtractor={(deck) => deck.id}
        refreshing={loading}
        onRefresh={() => void loadDecks()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.title}>Decks</Text>
            <Text style={styles.subhead}>
              Create and manage your decks, or explore the example decks.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <Text style={styles.status}>Syncing changes…</Text> : null}
            <View style={styles.form}>
              <TextInput
                value={deckName}
                onChangeText={setDeckName}
                placeholder="New deck name"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <Pressable style={styles.addButton} onPress={() => void createDeck()}>
                <Text style={styles.addLabel}>Add deck</Text>
              </Pressable>
            </View>
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort decks</Text>
              <View style={styles.sortOptions}>
                {SORT_OPTIONS.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[styles.sortChip, deckSort === option.id && styles.sortChipActive]}
                    onPress={() => setDeckSort(option.id)}
                  >
                    <Text
                      style={[
                        styles.sortChipLabel,
                        deckSort === option.id && styles.sortChipLabelActive,
                      ]}
                    >
                      {option.label}
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
            <Text style={styles.empty}>No decks yet.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.row, item.isExample && styles.exampleRow]}>
            <Pressable
              style={styles.rowMain}
              onPress={() =>
                router.push({ pathname: '/deck/[deckId]', params: { deckId: item.id } })
              }
            >
              <View style={styles.rowTitle}>
                <Text style={styles.deckName}>{item.name}</Text>
                {item.isExample ? <Text style={styles.badge}>Example</Text> : null}
              </View>
              <Text style={styles.meta}>{(item.movieCount ?? 0).toString()} films</Text>
            </Pressable>
            {item.isExample ? null : (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => promptRename(item)}
                  accessibilityLabel={`Rename ${item.name}`}
                >
                  <Text style={styles.actionLabel}>Rename</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  accessibilityLabel={`Delete ${item.name}`}
                >
                  <Text style={styles.deleteLabel}>Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  signOut: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutLabel: {
    color: colors.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  intro: {
    gap: 10,
    marginBottom: 8,
  },
  title: {
    color: colors.heading,
    fontSize: 28,
    fontWeight: '700',
  },
  subhead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
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
  status: {
    color: colors.muted,
    fontSize: 14,
  },
  form: {
    gap: 8,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sortLabel: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: '700',
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
  row: {
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exampleRow: {
    backgroundColor: colors.exampleRow,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionLabel: {
    color: colors.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteLabel: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  rowTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deckName: {
    flexShrink: 1,
    color: colors.heading,
    fontSize: 16,
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
  meta: {
    color: colors.muted,
    fontWeight: '600',
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
})

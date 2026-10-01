import { useClerk } from '@clerk/expo'
import { ApiRoute, type Deck } from '@good-vs-fun/shared'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useApiFetch } from '@/lib/api'
import { colors, radii } from '@/theme'

type DecksResponse = {
  decks?: Deck[]
}

type DeckResponse = {
  deck?: Deck
}

export function DecksScreen() {
  const apiFetch = useApiFetch()
  const { signOut } = useClerk()
  const [decks, setDecks] = useState<Deck[]>([])
  const [deckName, setDeckName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
        body: JSON.stringify({ name: trimmedName }),
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

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.brand}>Good vs. Fun</Text>
        <Pressable style={styles.signOut} onPress={() => void signOut()}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </View>

      <FlatList
        data={decks}
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
            <View style={styles.rowTitle}>
              <Text style={styles.deckName}>{item.name}</Text>
              {item.isExample ? <Text style={styles.badge}>Example</Text> : null}
            </View>
            <Text style={styles.meta}>{(item.movieCount ?? 0).toString()} films</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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

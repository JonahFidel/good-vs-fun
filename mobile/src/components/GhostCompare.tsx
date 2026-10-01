import type { Deck } from '@good-vs-fun/shared'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radii } from '@/theme'

type Slot = 1 | 2

type Props = {
  decksLoaded: boolean
  otherDecks: Deck[]
  ghostDeckId: string
  ghost2DeckId: string
  ghostDeckName: string
  ghost2DeckName: string
  onGhostDeckChange: (id: string) => void
  onGhost2DeckChange: (id: string) => void
  onSwap: (slot: Slot) => void
}

export function GhostCompare({
  decksLoaded,
  otherDecks,
  ghostDeckId,
  ghost2DeckId,
  ghostDeckName,
  ghost2DeckName,
  onGhostDeckChange,
  onGhost2DeckChange,
  onSwap,
}: Props) {
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)
  const insets = useSafeAreaInsets()

  if (decksLoaded && otherDecks.length === 0 && !ghostDeckId && !ghost2DeckId) {
    return null
  }

  const openValue = openSlot === 1 ? ghostDeckId : ghost2DeckId
  const excludedId = openSlot === 1 ? ghost2DeckId : ghostDeckId
  const options = otherDecks.filter((deck) => deck.id !== excludedId)

  const choose = (id: string) => {
    if (openSlot === 1) {
      onGhostDeckChange(id)
    } else if (openSlot === 2) {
      onGhost2DeckChange(id)
    }
    setOpenSlot(null)
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Compare</Text>
      <DeckSlot
        label="Compare with"
        value={ghostDeckId}
        name={ghostDeckName}
        onOpen={() => setOpenSlot(1)}
        onSwap={ghostDeckId ? () => onSwap(1) : undefined}
      />
      <DeckSlot
        label="And also"
        value={ghost2DeckId}
        name={ghost2DeckName}
        onOpen={() => setOpenSlot(2)}
        onSwap={ghost2DeckId ? () => onSwap(2) : undefined}
      />
      <Text style={styles.hint}>
        Ghost decks are view-only on the grid. Edit the primary deck, then swap if needed.
      </Text>

      <Modal
        visible={openSlot !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenSlot(null)}
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityLabel="Close deck list"
            style={styles.dismiss}
            onPress={() => setOpenSlot(null)}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.sheetTitle}>
              {openSlot === 2 ? 'And also' : 'Compare with'}
            </Text>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              <DeckOption
                label="None"
                selected={!openValue}
                onPress={() => choose('')}
              />
              {!decksLoaded && options.length === 0 ? (
                <Text style={styles.loading}>Loading decks…</Text>
              ) : null}
              {options.map((deck) => (
                <DeckOption
                  key={deck.id}
                  label={deck.name}
                  example={Boolean(deck.isExample)}
                  selected={deck.id === openValue}
                  onPress={() => choose(deck.id)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function DeckSlot({
  label,
  value,
  name,
  onOpen,
  onSwap,
}: {
  label: string
  value: string
  name: string
  onOpen: () => void
  onSwap?: () => void
}) {
  const shown = value ? name || '…' : 'None'
  return (
    <View style={styles.slot}>
      <Text style={styles.slotLabel}>{label}</Text>
      <View style={styles.slotRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${shown}`}
          style={styles.picker}
          onPress={onOpen}
        >
          <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]} numberOfLines={1}>
            {shown}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>
        {onSwap ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Swap ${shown} with the primary deck`}
            style={styles.swap}
            onPress={onSwap}
          >
            <Text style={styles.swapLabel}>Swap</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function DeckOption({
  label,
  selected,
  example = false,
  onPress,
}: {
  label: string
  selected: boolean
  example?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {example ? <Text style={styles.example}>Example</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
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
  slot: {
    gap: 6,
  },
  slotLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  slotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  picker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.background,
  },
  pickerText: {
    flex: 1,
    color: colors.heading,
    fontSize: 16,
    fontWeight: '600',
  },
  pickerPlaceholder: {
    color: colors.muted,
    fontWeight: '500',
  },
  chevron: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  swap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.control,
    backgroundColor: colors.heading,
  },
  swapLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    maxHeight: '70%',
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.surface,
  },
  sheetTitle: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetList: {
    flexGrow: 0,
  },
  loading: {
    paddingVertical: 12,
    color: colors.muted,
    fontSize: 15,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.background,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  optionLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: colors.heading,
    fontWeight: '700',
  },
  example: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: colors.exampleSurface,
    color: colors.exampleText,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
})

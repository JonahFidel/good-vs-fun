import { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors, radii } from '@/theme'

type Props = {
  visible: boolean
  title: string
  initialValue: string
  onCancel: () => void
  onSubmit: (value: string) => void
}

export function TextPrompt({
  visible,
  title,
  initialValue,
  onCancel,
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (visible) {
      setValue(initialValue)
    }
  }, [initialValue, visible])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            autoCapitalize="sentences"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.secondaryButton}>
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit(value)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryLabel}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  card: {
    gap: 12,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    color: colors.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.heading,
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
})

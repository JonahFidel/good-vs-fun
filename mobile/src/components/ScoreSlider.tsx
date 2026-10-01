import { formatScore, SCORE_MAX, SCORE_MIN, snapScoreToStep } from '@good-vs-fun/shared'
import { useMemo, useRef } from 'react'
import { PanResponder, StyleSheet, Text, View } from 'react-native'
import { colors } from '@/theme'

type Props = {
  label: string
  value: number
  disabled?: boolean
  onAdjustStart?: () => void
  onChange: (value: number) => void
  onCommit?: (value: number) => void
}

export function ScoreSlider({
  label,
  value,
  disabled = false,
  onAdjustStart,
  onChange,
  onCommit,
}: Props) {
  const widthRef = useRef(1)
  const latestRef = useRef(value)
  const onAdjustStartRef = useRef(onAdjustStart)
  const onChangeRef = useRef(onChange)
  const onCommitRef = useRef(onCommit)
  const disabledRef = useRef(disabled)
  latestRef.current = value
  onAdjustStartRef.current = onAdjustStart
  onChangeRef.current = onChange
  onCommitRef.current = onCommit
  disabledRef.current = disabled

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          onAdjustStartRef.current?.()
          applyScore(event.nativeEvent.locationX)
        },
        onPanResponderMove: (event) => {
          applyScore(event.nativeEvent.locationX)
        },
        onPanResponderRelease: () => {
          onCommitRef.current?.(latestRef.current)
        },
        onPanResponderTerminate: () => {
          onCommitRef.current?.(latestRef.current)
        },
      }),
    [],
  )

  function applyScore(x: number) {
    const ratio = Math.min(1, Math.max(0, x / widthRef.current))
    const next = snapScoreToStep(SCORE_MIN + ratio * (SCORE_MAX - SCORE_MIN))
    latestRef.current = next
    onChangeRef.current(next)
  }

  const fill = ((value - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100

  return (
    <View
      style={[styles.wrap, disabled && styles.disabled]}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: SCORE_MIN, max: SCORE_MAX, now: value }}
    >
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatScore(value)}</Text>
      </View>
      <View
        style={styles.hit}
        onLayout={(event) => {
          widthRef.current = Math.max(1, event.nativeEvent.layout.width)
        }}
        {...pan.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${fill}%` }]} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  disabled: {
    opacity: 0.45,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: colors.heading,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hit: {
    justifyContent: 'center',
    height: 36,
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.heading,
  },
})

import { formatScore, SCORE_MAX, type Movie } from '@good-vs-fun/shared'
import { useMemo, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import {
  groupByPosition,
  PLOT_MARGIN,
  PLOT_SPAN,
  scoreToPlotPercent,
  type PositionGroup,
} from '@/lib/plot'
import { colors, radii } from '@/theme'

const GRID_LINES = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const AXIS_TICKS = [0, 5, 10]

const regionPercent = {
  left: `${(PLOT_MARGIN / PLOT_SPAN) * 100}%`,
  bottom: `${(PLOT_MARGIN / PLOT_SPAN) * 100}%`,
  width: `${(SCORE_MAX / PLOT_SPAN) * 100}%`,
  height: `${(SCORE_MAX / PLOT_SPAN) * 100}%`,
} as const

export type PlotLegend = {
  primary: string
  ghost?: string
  ghost2?: string
}

type Props = {
  movies: Movie[]
  selectedMovieId: string | null
  onSelect: (id: string | null) => void
  pending?: boolean
  ghostMovies?: Movie[]
  ghost2Movies?: Movie[]
  legend?: PlotLegend | null
}

export function MoviePlot({
  movies,
  selectedMovieId,
  onSelect,
  pending = false,
  ghostMovies = [],
  ghost2Movies = [],
  legend = null,
}: Props) {
  const [size, setSize] = useState(0)
  const groups = useMemo(() => groupByPosition(movies), [movies])
  const ghostGroups = useMemo(() => groupByPosition(ghostMovies), [ghostMovies])
  const ghost2Groups = useMemo(() => groupByPosition(ghost2Movies), [ghost2Movies])

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width)
    setSize((current) => (current === next ? current : next))
  }

  const selectGroup = (group: PositionGroup) => {
    const ids = group.items.map((item) => item.id)
    if (selectedMovieId && ids.includes(selectedMovieId) && ids.length > 1) {
      const index = ids.indexOf(selectedMovieId)
      onSelect(ids[(index + 1) % ids.length])
      return
    }
    onSelect(ids[0])
  }

  return (
    <View style={styles.card}>
      <View style={styles.plotRow}>
        <View style={styles.funAxisSlot}>
          <Text style={styles.funAxis}>Fun</Text>
        </View>
        <View style={styles.plotSlot} onLayout={handleLayout}>
          {size > 0 ? (
            <View style={{ width: size, height: size }}>
              <View style={styles.region} pointerEvents="none">
                {GRID_LINES.map((value) => (
                  <View
                    key={`x-${value}`}
                    style={[styles.gridLineY, { left: `${(value / SCORE_MAX) * 100}%` }]}
                  />
                ))}
                {GRID_LINES.map((value) => (
                  <View
                    key={`y-${value}`}
                    style={[styles.gridLineX, { bottom: `${(value / SCORE_MAX) * 100}%` }]}
                  />
                ))}
              </View>
              {AXIS_TICKS.map((value) => (
                <Text
                  key={`tick-x-${value}`}
                  style={[styles.tick, styles.tickX, { left: `${scoreToPlotPercent(value, 'x')}%` }]}
                  pointerEvents="none"
                >
                  {value}
                </Text>
              ))}
              {AXIS_TICKS.map((value) => (
                <Text
                  key={`tick-y-${value}`}
                  style={[styles.tick, styles.tickY, { top: `${scoreToPlotPercent(value, 'y')}%` }]}
                  pointerEvents="none"
                >
                  {value}
                </Text>
              ))}
              <GhostDots groups={ghostGroups} color={colors.ghost1} ring={colors.ghost1Ring} />
              <GhostDots
                groups={ghost2Groups}
                color={colors.ghost2}
                ring={colors.ghost2Ring}
                offset
              />
              <Pressable
                accessible={false}
                style={StyleSheet.absoluteFill}
                onPress={() => onSelect(null)}
              />
              {groups.map((group) => {
                const selected =
                  selectedMovieId !== null &&
                  group.items.some((item) => item.id === selectedMovieId)
                const labelOnLeft = group.good >= 4
                return (
                  <Pressable
                    key={group.key}
                    accessibilityRole="button"
                    accessibilityLabel={groupLabel(group)}
                    hitSlop={10}
                    onPress={() => selectGroup(group)}
                    style={[
                      styles.point,
                      {
                        left: `${scoreToPlotPercent(group.good, 'x')}%`,
                        top: `${scoreToPlotPercent(group.fun, 'y')}%`,
                        zIndex: selected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.dot, selected && styles.dotSelected]} />
                    {group.items.length > 1 && !selected ? (
                      <View style={styles.countBadge} pointerEvents="none">
                        <Text style={styles.count}>{group.items.length}</Text>
                      </View>
                    ) : null}
                    {selected ? (
                      <View
                        style={[
                          styles.label,
                          labelOnLeft ? styles.labelLeft : styles.labelRight,
                          styles.labelSelected,
                        ]}
                        pointerEvents="none"
                      >
                        {group.items.map((item) => (
                          <Text
                            key={item.id}
                            numberOfLines={1}
                            style={[
                              styles.labelText,
                              item.id === selectedMovieId && styles.labelTextSelected,
                            ]}
                          >
                            {item.title}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                )
              })}
              {movies.length === 0 &&
              ghostMovies.length === 0 &&
              ghost2Movies.length === 0 &&
              !pending ? (
                <View style={styles.empty} pointerEvents="none">
                  <Text style={styles.emptyText}>Movies land here by Good and Fun.</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
      <Text style={styles.goodAxis}>Good</Text>
      {legend ? (
        <View style={styles.legend}>
          <LegendItem color={colors.plotDot} label={legend.primary} />
          {legend.ghost ? <LegendItem color={colors.ghost1} label={legend.ghost} /> : null}
          {legend.ghost2 ? <LegendItem color={colors.ghost2} label={legend.ghost2} /> : null}
        </View>
      ) : null}
    </View>
  )
}

function GhostDots({
  groups,
  color,
  ring,
  offset = false,
}: {
  groups: PositionGroup[]
  color: string
  ring: string
  offset?: boolean
}) {
  return groups.map((group) => (
    <View
      key={group.key}
      pointerEvents="none"
      style={[
        styles.point,
        offset ? styles.pointGhost2 : null,
        {
          left: `${scoreToPlotPercent(group.good, 'x')}%`,
          top: `${scoreToPlotPercent(group.fun, 'y')}%`,
          opacity: 0.65,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color, borderColor: ring }]} />
      {group.items.length > 1 ? (
        <View style={[styles.countBadge, { backgroundColor: color }]}>
          <Text style={styles.count}>{group.items.length}</Text>
        </View>
      ) : null}
    </View>
  ))
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function groupLabel(group: PositionGroup) {
  const titles = group.items.map((item) => item.title).join(', ')
  return `${titles}. Good ${formatScore(group.good)}, Fun ${formatScore(group.fun)}`
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  plotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  funAxisSlot: {
    width: 22,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  funAxis: {
    width: 36,
    textAlign: 'center',
    color: colors.heading,
    fontSize: 12,
    fontWeight: '700',
    transform: [{ rotate: '-90deg' }],
  },
  plotSlot: {
    flex: 1,
    aspectRatio: 1,
  },
  region: {
    position: 'absolute',
    left: regionPercent.left,
    bottom: regionPercent.bottom,
    width: regionPercent.width,
    height: regionPercent.height,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.heading,
    backgroundColor: colors.background,
  },
  gridLineY: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
  },
  gridLineX: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  tick: {
    position: 'absolute',
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  tickX: {
    bottom: 0,
    transform: [{ translateX: -4 }],
  },
  tickY: {
    left: 0,
    transform: [{ translateY: -6 }],
  },
  point: {
    position: 'absolute',
    zIndex: 0,
    transform: [{ translateX: -5 }, { translateY: -5 }],
  },
  pointGhost2: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.plotDot,
    borderWidth: 2,
    borderColor: colors.plotDotRing,
  },
  countBadge: {
    position: 'absolute',
    top: -6,
    left: 8,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.heading,
  },
  count: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  dotSelected: {
    backgroundColor: colors.plotSelected,
    borderColor: colors.plotSelectedRing,
  },
  label: {
    position: 'absolute',
    top: -4,
    maxWidth: 132,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.plotLabel,
    borderWidth: 1,
    borderColor: colors.plotLabelBorder,
  },
  labelLeft: {
    right: 14,
  },
  labelRight: {
    left: 14,
  },
  labelSelected: {
    borderColor: colors.plotSelectedRing,
  },
  labelText: {
    color: colors.plotLabelText,
    fontSize: 10,
    fontWeight: '600',
  },
  labelTextSelected: {
    color: colors.plotSelectedText,
  },
  empty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  goodAxis: {
    marginLeft: 26,
    textAlign: 'center',
    color: colors.heading,
    fontSize: 12,
    fontWeight: '700',
  },
  legend: {
    gap: 6,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
  },
})

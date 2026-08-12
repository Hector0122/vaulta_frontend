import React, { useEffect } from 'react'
import {
  View,
  StyleSheet,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../theme'
import type { ThemeColors } from '../theme'
import { radius } from '../tokens'

export function SkeletonBox({
  width,
  height,
  style,
  borderRadius = 6,
}: {
  width?: number | `${number}%`
  height?: number | `${number}%`
  style?: ViewStyle
  borderRadius?: number
}) {
  const { colors } = useTheme()
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    // 800ms es deliberado, no de `motion.duration` — es un pulso ambiental
    // continuo (loading placeholder), no una transición puntual.
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
    )
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  )
}

export function SkeletonPhotoGrid({
  _colors,
  count = 6,
}: {
  _colors: ThemeColors
  count?: number
}) {
  const { width: screenWidth } = useWindowDimensions()
  const colWidth = (screenWidth - 16 - 6) / 2
  const rows = Array.from({ length: Math.ceil(count / 2) })

  return (
    <View style={styles.photoGridRow}>
      {[0, 1].map(col => (
        <View key={col} style={styles.photoGridCol}>
          {rows.map((_, i) => (
            <SkeletonBox
              key={`${col}-${i}`}
              width={colWidth}
              height={col === i % 2 ? 200 : 250}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

export function SkeletonAlbumList({
  colors,
  count = 4,
}: {
  colors: ThemeColors
  count?: number
}) {
  return (
    <View style={styles.albumListPad}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[styles.albumRow, { backgroundColor: colors.cardBg }]}
        >
          <SkeletonBox width={24} height={24} borderRadius={radius.md} />
          <View style={styles.albumRowRight}>
            <SkeletonBox width="60%" height={16} borderRadius={4} />
            <SkeletonBox
              width="30%"
              height={12}
              borderRadius={4}
              style={styles.albumBoxSpacer}
            />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  photoGridRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8 },
  photoGridCol: { flex: 1, gap: 6 },
  albumListPad: { padding: 16 },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: radius.sm,
    marginBottom: 12,
  },
  albumRowRight: { marginLeft: 12, flex: 1 },
  albumBoxSpacer: { marginTop: 6 },
})

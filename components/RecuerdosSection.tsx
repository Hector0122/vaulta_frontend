import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import type { ThemeColors } from '../theme'

type Recuerdo = {
  year: number
  uri: string
  fullUri: string
  largeUri?: string | null
  id: string
  filename: string
  count: number
  yearsAgo: number
  mimeType?: string
}

type Props = {
  recuerdos: Recuerdo[]
  colors: ThemeColors
  onPressRecuerdo: (r: Recuerdo) => void
}

function RecuerdoCard({
  r,
  colors,
  onPress,
}: {
  r: Recuerdo
  colors: ThemeColors
  onPress: (r: Recuerdo) => void
}) {
  const [error, setError] = useState(false)

  return (
    <TouchableOpacity
      key={`${r.year}-${r.id}`}
      style={[styles.card, { backgroundColor: colors.cardBg }]}
      onPress={() => onPress(r)}
      activeOpacity={0.85}
    >
      <View style={styles.thumbWrap}>
        {error ? (
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: colors.inputBg,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <Icon name="photo" size={28} color={colors.textTertiary} />
          </View>
        ) : (
          <Image
            source={{ uri: r.uri }}
            style={styles.thumb}
            onError={() => setError(true)}
          />
        )}
        {r.count > 1 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.primary + 'E6' },
            ]}
          >
            <Text style={styles.badgeText}>{r.count}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.yearLabel, { color: colors.text }]}>
        {r.year}
      </Text>
      <Text style={[styles.agoLabel, { color: colors.textTertiary }]}>
        Hace {r.yearsAgo} año{r.yearsAgo > 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  )
}

export default function RecuerdosSection({
  recuerdos,
  colors,
  onPressRecuerdo,
}: Props) {
  if (recuerdos.length === 0) return null

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
          <Icon name="history" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Recuerdos</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {recuerdos.map(r => (
          <RecuerdoCard
            key={`${r.year}-${r.id}`}
            r={r}
            colors={colors}
            onPress={onPressRecuerdo}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12, paddingLeft: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  card: {
    marginRight: 10,
    alignItems: 'center',
    width: 120,
    borderRadius: 12,
    padding: 6,
  },
  thumbWrap: {
    width: 120,
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  yearLabel: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  agoLabel: { fontSize: 11, marginTop: 1, textAlign: 'center' },
})

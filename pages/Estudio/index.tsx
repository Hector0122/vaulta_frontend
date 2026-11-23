import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme } from '../../theme'
import { iconSize, radius, spacing } from '../../tokens'
import { listDrafts, type Draft } from '../../api/estudio'
import type { StackNavProp } from '../../types/navigation'

export default function EstudioScreen({ navigation }: { navigation: StackNavProp }) {
  const { colors } = useTheme()
  const [drafts, setDrafts] = useState<Draft[]>([])

  useFocusEffect(useCallback(() => setDrafts(listDrafts()), []))

  if (drafts.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Icon name="palette-outline" size={iconSize.xl} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Aún no hay publicaciones</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          En Fotos, mantén presionada una foto, selecciona hasta 10 y toca «Estudio».
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      data={drafts}
      keyExtractor={d => d.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('EstudioDraft', { draftId: item.id })}
          accessibilityRole="button"
          accessibilityLabel={`Borrador de ${item.photoIds.length} foto(s)`}
        >
          <View style={[styles.cover, { backgroundColor: colors.skeleton }]}>
            {item.coverUri && <Image source={{ uri: item.coverUri }} style={StyleSheet.absoluteFill} />}
          </View>
          <View style={styles.info}>
            <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>
              {item.caption || 'Sin caption'}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {item.photoIds.length} foto(s) · {item.ratio} ·{' '}
              {new Date(item.updatedAt).toLocaleDateString('es-MX')}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: item.published ? colors.success : colors.surfaceAlt },
            ]}
          >
            <Text style={[styles.badgeText, { color: item.published ? '#fff' : colors.textSecondary }]}>
              {item.published ? 'Publicada' : 'Pendiente'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  )
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: spacing.md },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md },
  cover: { width: 56, height: 70, borderRadius: radius.xs, overflow: 'hidden' },
  info: { flex: 1, marginHorizontal: spacing.sm },
  caption: { fontSize: 15 },
  meta: { fontSize: 12, marginTop: spacing.xxs },
  badge: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: '600' },
})

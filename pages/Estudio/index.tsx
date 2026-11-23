import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme } from '../../theme'
import { iconSize, radius, spacing } from '../../tokens'
import { createDraft, listDrafts, type Draft } from '../../api/estudio'
import { loadIdeas, type Idea } from '../../api/estudioIdeas'
import type { StackNavProp } from '../../types/navigation'

export default function EstudioScreen({ navigation }: { navigation: StackNavProp }) {
  const { colors } = useTheme()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [ideas, setIdeas] = useState<Idea[] | null>(null)

  useFocusEffect(
    useCallback(() => {
      let alive = true
      setDrafts(listDrafts())
      // se recargan al volver: las fotos usadas en un borrador salen de las ideas
      loadIdeas().then(i => alive && setIdeas(i))
      return () => {
        alive = false
      }
    }, []),
  )

  const handleIdea = (idea: Idea) => {
    // doble toque o tarjeta vieja: reabrir el borrador en vez de duplicarlo
    const key = idea.photoIds.join()
    const draft =
      listDrafts().find(d => d.photoIds.join() === key) ??
      createDraft(idea.photoIds, idea.coverUri, idea.caption)
    navigation.navigate('EstudioDraft', { draftId: draft.id })
  }

  const ideasSection = (
    <View style={styles.ideas}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Ideas para publicar</Text>
      {ideas === null ? (
        <ActivityIndicator color={colors.textSecondary} style={{ marginVertical: spacing.lg }} />
      ) : ideas.length === 0 ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Sin ideas por ahora. Marca favoritas o nombra personas para recibir más.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {ideas.map(idea => (
            <TouchableOpacity
              key={idea.key}
              style={[styles.ideaCard, { backgroundColor: colors.surface }]}
              onPress={() => handleIdea(idea)}
              accessibilityRole="button"
              accessibilityLabel={`${idea.title}, ${idea.subtitle}`}
            >
              <Image source={{ uri: idea.coverUri }} style={styles.ideaCover} />
              <Text style={[styles.ideaTitle, { color: colors.text }]} numberOfLines={1}>
                {idea.title}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {idea.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>Tus publicaciones</Text>
    </View>
  )

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      data={drafts}
      keyExtractor={d => d.id}
      ListHeaderComponent={ideasSection}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Icon name="palette-outline" size={iconSize.lg} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Toca una idea, o en Fotos selecciona hasta 10 y toca «Estudio».
          </Text>
        </View>
      }
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
  ideas: { marginBottom: spacing.xxs },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: spacing.sm },
  ideaCard: { width: 150, borderRadius: radius.md, padding: spacing.xs },
  ideaCover: { width: '100%', height: 150, borderRadius: radius.sm, marginBottom: spacing.xs },
  ideaTitle: { fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md },
  cover: { width: 56, height: 70, borderRadius: radius.xs, overflow: 'hidden' },
  info: { flex: 1, marginHorizontal: spacing.sm },
  caption: { fontSize: 15 },
  meta: { fontSize: 12, marginTop: spacing.xxs },
  badge: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: '600' },
})

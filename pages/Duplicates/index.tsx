import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { NitroImage } from 'react-native-nitro-image'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../../theme'
import {
  authenticatedGet,
  deletePhoto,
  bulkDeletePhotos,
} from '../../api/client'

type DuplicateGroup = {
  id: string
  url: string
  filename: string
  perceptualHash: string
  blurred: boolean
  blurScore: number | null
  createdAt: string
}[]

export default function DuplicatesScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    authenticatedGet<DuplicateGroup[]>('photos/duplicates')
      .then(data => {
        setGroups(data)
        setLoading(false)
      })
      .catch(() => {
        Alert.alert('Error', 'No se pudieron cargar los duplicados')
        setLoading(false)
      })
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleDeleteSelected = () => {
    if (selected.size === 0) return
    Alert.alert('Eliminar duplicados', `Eliminar ${selected.size} foto(s)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          const ids = Array.from(selected)
          try {
            await bulkDeletePhotos(ids)
          } catch {
            for (const id of ids) {
              try {
                await deletePhoto(id)
              } catch {
                /* skip */
              }
            }
          }
          setGroups(prev =>
            prev
              .map(g => g.filter(p => !selected.has(p.id)))
              .filter(g => g.length > 1),
          )
          setSelected(new Set())
          setDeleting(false)
        },
      },
    ])
  }

  const _selectAll = () => {
    const all = new Set<string>()
    groups.forEach(g => g.forEach(p => all.add(p.id)))
    setSelected(all)
  }

  const pickBestId = useCallback((group: DuplicateGroup): string => {
    const sorted = [...group].sort((a, b) => {
      // Prefer non-blurred
      if (a.blurred !== b.blurred) return a.blurred ? 1 : -1
      // Prefer lower blurScore (sharper)
      const sa = a.blurScore ?? 999
      const sb = b.blurScore ?? 999
      if (sa !== sb) return sa - sb
      // Prefer most recent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return sorted[0].id
  }, [])

  const selectAllKeepBest = () => {
    const toDelete = new Set<string>()
    groups.forEach(g => {
      const bestId = pickBestId(g)
      g.forEach(p => {
        if (p.id !== bestId) toDelete.add(p.id)
      })
    })
    setSelected(toDelete)
  }

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={selectAllKeepBest}>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>
            Conservar mejor
          </Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation, colors.primary, selectAllKeepBest])

  const renderGroup = useCallback(
    ({ item: group }: { item: DuplicateGroup }) => {
      const bestId = pickBestId(group)
      return (
        <View style={[styles.group, { backgroundColor: colors.cardBg }]}>
          <View style={styles.groupHeader}>
            <Icon name="content-copy" size={18} color={colors.textTertiary} />
            <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
              {group.length} fotos similares
            </Text>
          </View>
          <View style={styles.groupRow}>
            {group.map(photo => (
              <TouchableOpacity
                key={photo.id}
                style={[
                  styles.thumbWrap,
                  selected.has(photo.id) && [
                    styles.thumbSelected,
                    { borderColor: colors.danger },
                  ],
                  photo.id === bestId &&
                    !selected.has(photo.id) && [
                      styles.thumbSelected,
                      { borderColor: colors.success },
                    ],
                ]}
                onPress={() => toggleSelect(photo.id)}
              >
                <NitroImage
                  image={{ url: photo.url }}
                  style={styles.thumb}
                  resizeMode="cover"
                  recyclingKey={photo.id}
                />
                {photo.id === bestId && (
                  <View
                    style={[
                      styles.blurryBadge,
                      { backgroundColor: colors.success },
                    ]}
                  >
                    <Icon name="star" size={11} color="#fff" />
                  </View>
                )}
                {selected.has(photo.id) && (
                  <View
                    style={[
                      styles.blurryBadge,
                      { backgroundColor: colors.danger },
                    ]}
                  >
                    <Icon name="delete" size={11} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )
    },
    [colors, selected, toggleSelect, pickBestId],
  )

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (groups.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Icon name="check-circle" size={64} color={colors.success} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No hay fotos duplicadas
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={groups}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={renderGroup}
      />

      {selected.size > 0 && (
        <View style={[styles.deleteBar, { backgroundColor: colors.danger }]}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteSelected}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="delete" size={22} color="#fff" />
                <Text style={styles.deleteText}>
                  Eliminar {selected.size} seleccionada(s)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 16 },
  list: { padding: 12, gap: 12, paddingBottom: 80 },
  group: {
    borderRadius: 12,
    padding: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  groupCount: { fontSize: 13, fontWeight: '500' },
  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumbWrap: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    borderColor: 'transparent',
    borderWidth: 2,
  },
  thumb: { width: '100%', height: '100%' },
  blurryBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  thumbSelected: { borderWidth: 2 },
})

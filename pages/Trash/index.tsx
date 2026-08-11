import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme } from '../../theme'
import {
  getTrash,
  restorePhoto,
  permanentlyDeletePhoto,
  emptyTrash,
} from '../../api/client'

type TrashItem = {
  id: string
  uri: string
  filename: string
  deletedAt: string
  size: number
}

function TrashItemCard({
  item,
  colors,
  onRestore,
  onDelete,
}: {
  item: TrashItem
  colors: any
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
      {imgError ? (
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
          <Icon name="image-broken-variant" size={24} color={colors.textTertiary} />
        </View>
      ) : (
        <Image
          source={{ uri: item.uri }}
          style={styles.thumb}
          onError={() => setImgError(true)}
        />
      )}
      <View style={styles.info}>
        <Text
          style={[styles.filename, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.filename}
        </Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          Eliminada: {new Date(item.deletedAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onRestore(item.id)}
          style={styles.actionBtn}
        >
          <Icon name="restore" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={styles.actionBtn}
        >
          <Icon name="delete-forever" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function TrashScreen() {
  const { colors } = useTheme()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTrash = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTrash()
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchTrash()
    }, [fetchTrash]),
  )

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        await restorePhoto(id)
        fetchTrash()
      } catch {
        Alert.alert('Error', 'No se pudo restaurar')
      }
    },
    [fetchTrash],
  )

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      Alert.alert(
        'Eliminar permanentemente',
        'Esta foto se borrará de S3 y no podrá recuperarse.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await permanentlyDeletePhoto(id)
                fetchTrash()
              } catch {
                Alert.alert('Error', 'No se pudo eliminar')
              }
            },
          },
        ],
      )
    },
    [fetchTrash],
  )

  async function handleEmptyTrash() {
    Alert.alert(
      'Vaciar papelera',
      'Se borrarán todas las fotos permanentemente. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await emptyTrash()
              fetchTrash()
              Alert.alert(
                'Hecho',
                `Se eliminaron ${res.deleted} fotos permanentemente`,
              )
            } catch (e: unknown) {
              const msg =
                e instanceof Error ? e.message : 'Error desconocido'
              Alert.alert('Error', `No se pudo vaciar la papelera: ${msg}`)
            }
          },
        },
      ],
    )
  }

  const renderItem = useCallback(
    ({ item }: { item: TrashItem }) => (
      <TrashItemCard
        item={item}
        colors={colors}
        onRestore={handleRestore}
        onDelete={handlePermanentDelete}
      />
    ),
    [colors, handleRestore, handlePermanentDelete],
  )

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.fill}
        />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="delete-sweep" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Papelera vacía
          </Text>
        </View>
      ) : (
        <View style={styles.fill}>
          <TouchableOpacity
            style={styles.emptyAllBtn}
            onPress={handleEmptyTrash}
          >
            <Icon name="delete-sweep" size={20} color="#fff" />
            <Text style={styles.emptyAllText}>Vaciar papelera</Text>
          </TouchableOpacity>
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={renderItem}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  emptyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c62828',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  emptyAllText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  container: { flex: 1 },
  list: { padding: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  thumb: { width: 52, height: 52, borderRadius: 6 },
  info: { flex: 1, marginLeft: 10 },
  filename: { fontSize: 14, fontWeight: '500' },
  date: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  fill: { flex: 1 },
})

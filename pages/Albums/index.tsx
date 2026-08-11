import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme } from '../../theme'
import { SkeletonAlbumList } from '../../components/Skeleton'
import {
  authenticatedGet,
  authenticatedDelete,
  authenticatedPost,
} from '../../api/client'
import type { StackNavProp } from '../../types/navigation'

type Album = {
  id: string
  name: string
  _count: { photos: number }
  createdAt: string
  coverUri: string | null
}

export default function AlbumsScreen() {
  const navigation = useNavigation<StackNavProp>()
  const { colors } = useTheme()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchAlbums = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authenticatedGet<Album[]>('albums')
      setAlbums(data)
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los álbumes')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchAlbums()
    }, [fetchAlbums]),
  )

  async function handleCreate() {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      await authenticatedPost('albums', { name: newName.trim() })
      setNewName('')
      setShowCreate(false)
      fetchAlbums()
    } catch {
      Alert.alert('Error', 'No se pudo crear el álbum')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert('Eliminar álbum', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id)
          try {
            await authenticatedDelete(`albums/${id}`)
            fetchAlbums()
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el álbum')
          } finally {
            setDeletingId(null)
          }
        },
      },
    ])
  }, [fetchAlbums])

  const renderItem = useCallback(
    ({ item }: { item: Album }) => {
      return (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.cardBg, opacity: deletingId === item.id ? 0.5 : 1 }]}
          onPress={() =>
            navigation.navigate('AlbumView', {
              albumId: item.id,
              albumName: item.name,
            })
          }
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            {item.coverUri ? (
              <Image
                source={{ uri: item.coverUri }}
                style={styles.coverThumb}
              />
            ) : (
              <View
                style={[
                  styles.coverPlaceholder,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Icon name="image-multiple-outline" size={24} color={colors.primary} />
              </View>
            )}
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.textTertiary }]}
              >
                {item._count?.photos ?? 0} fotos
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={deletingId === item.id}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color={colors.textTertiary} />
            ) : (
              <Icon name="delete-outline" size={22} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      )
    },
    [navigation, colors, handleDelete, deletingId],
  )

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonAlbumList colors={colors} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Vault entry */}
      <TouchableOpacity
        style={[
          styles.vaultCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate('VaultView')}
        activeOpacity={0.7}
      >
        <Icon name="lock-outline" size={22} color="#ffa726" />
        <Text style={[styles.vaultText, { color: colors.text }]}>
          Caja Fuerte
        </Text>
        <Icon name="chevron-right" size={22} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* People entry */}
      <TouchableOpacity
        style={[
          styles.vaultCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate('People')}
        activeOpacity={0.7}
      >
        <Icon name="face-recognition" size={22} color={colors.primary} />
        <Text style={[styles.vaultText, { color: colors.text }]}>
          Personas
        </Text>
        <Icon name="chevron-right" size={22} color={colors.textTertiary} />
      </TouchableOpacity>

      {showCreate && (
        <View
          style={[styles.createRow, { borderBottomColor: colors.borderLight }]}
        >
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.inputBg,
              },
            ]}
            placeholder="Nombre del álbum"
            placeholderTextColor={colors.textTertiary}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createBtnText}>Crear</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {albums.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="image-multiple-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No hay álbumes aún
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreate(true)}
          >
            <Text style={styles.addBtnText}>Crear primer álbum</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true)
                await fetchAlbums()
                setRefreshing(false)
              }}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {albums.length > 0 && !showCreate && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
        >
          <Icon name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  vaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  vaultText: { fontSize: 16, fontWeight: '600', flex: 1 },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  coverThumb: { width: 44, height: 44, borderRadius: 8 },
  coverPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { marginLeft: 12, flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  createRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  createBtn: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 16, marginTop: 12 },
  addBtn: {
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
})

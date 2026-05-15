import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../../theme'
import { SkeletonAlbumList } from '../../components/Skeleton'
import { authenticatedGet, authenticatedDelete, authenticatedPost } from '../../api/client'

type Album = { id: string; name: string; _count: { photos: number }; createdAt: string }

export default function AlbumsScreen() {
  const { colors } = useTheme()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

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
    useCallback(() => { fetchAlbums() }, [fetchAlbums]),
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

  async function handleDelete(id: string) {
    Alert.alert('Eliminar álbum', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await authenticatedDelete(`albums/${id}`)
            fetchAlbums()
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el álbum')
          }
        },
      },
    ])
  }

  function renderItem({ item }: { item: Album }) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
        <View style={styles.cardContent}>
          <Icon name="photo-album" size={24} color={colors.primary} />
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textTertiary }]}>{item._count?.photos ?? 0} fotos</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Icon name="delete-outline" size={22} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonAlbumList colors={colors} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showCreate && (
        <View style={[styles.createRow, { borderBottomColor: colors.borderLight }]}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder="Nombre del álbum"
            placeholderTextColor={colors.textTertiary}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}>
            <Text style={styles.createBtnText}>Crear</Text>
          </TouchableOpacity>
        </View>
      )}

      {albums.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="photo-album" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No hay álbumes aún</Text>
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
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {albums.length > 0 && !showCreate && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
        >
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
  cardText: { marginLeft: 12 },
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

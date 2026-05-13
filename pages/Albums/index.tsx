import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { authenticatedGet, authenticatedDelete } from '../../api/client'
import { BASE_URL } from '../../api/server'
import { getToken } from '../../api/client'

type Album = { id: string; name: string; _count: { photos: number }; createdAt: string }

export default function AlbumsScreen() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const fetchAlbums = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authenticatedGet<Album[]>('albums')
      setAlbums(data)
    } catch {
      Alert.alert('Error', 'Could not load albums')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => { fetchAlbums() }, [fetchAlbums]),
  )

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      const token = await getToken()
      await fetch(`${BASE_URL}/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim() }),
      })
      setNewName('')
      setShowCreate(false)
      fetchAlbums()
    } catch {
      Alert.alert('Error', 'Could not create album')
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete album', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await authenticatedDelete(`albums/${id}`)
            fetchAlbums()
          } catch {
            Alert.alert('Error', 'Could not delete album')
          }
        },
      },
    ])
  }

  function renderItem({ item }: { item: Album }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Icon name="photo-album" size={24} color="#222" />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item._count.photos} photos</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Icon name="delete-outline" size={22} color="#999" />
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#222" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {showCreate && (
        <View style={styles.createRow}>
          <TextInput
            style={styles.input}
            placeholder="Album name"
            placeholderTextColor="#999"
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}

      {albums.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="photo-album" size={56} color="#ccc" />
          <Text style={styles.emptyText}>No albums yet</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowCreate(true)}
          >
            <Text style={styles.addBtnText}>Create first album</Text>
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
          style={styles.fab}
          onPress={() => setShowCreate(true)}
        >
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 12,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardText: { marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  cardSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
  createRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#222',
    marginRight: 8,
  },
  createBtn: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
  addBtn: {
    marginTop: 16,
    backgroundColor: '#222',
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
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
})

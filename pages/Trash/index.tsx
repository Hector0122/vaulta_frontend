import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../../theme'
import { getTrash, restorePhoto, permanentlyDeletePhoto } from '../../api/client'

type TrashItem = { id: string; uri: string; filename: string; deletedAt: string; size: number }

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

  useFocusEffect(useCallback(() => { fetchTrash() }, [fetchTrash]))

  async function handleRestore(id: string) {
    try {
      await restorePhoto(id)
      fetchTrash()
    } catch { Alert.alert('Error', 'No se pudo restaurar') }
  }

  async function handlePermanentDelete(id: string) {
    Alert.alert('Eliminar permanentemente', 'Esta foto se borrará de S3 y no podrá recuperarse.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await permanentlyDeletePhoto(id)
            fetchTrash()
          } catch { Alert.alert('Error', 'No se pudo eliminar') }
        },
      },
    ])
  }

  const renderItem = useCallback(({ item }: { item: TrashItem }) => (
    <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
      <Image source={{ uri: item.uri }} style={styles.thumb} />
      <View style={styles.info}>
        <Text style={[styles.filename, { color: colors.text }]} numberOfLines={1}>{item.filename}</Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          Eliminada: {new Date(item.deletedAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleRestore(item.id)} style={styles.actionBtn}>
          <Icon name="restore" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePermanentDelete(item.id)} style={styles.actionBtn}>
          <Icon name="delete-forever" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  ), [colors, handleRestore, handlePermanentDelete])

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="delete-sweep" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Papelera vacía</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 10, marginBottom: 8,
  },
  thumb: { width: 52, height: 52, borderRadius: 6 },
  info: { flex: 1, marginLeft: 10 },
  filename: { fontSize: 14, fontWeight: '500' },
  date: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
})

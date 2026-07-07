import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import { useNavigation, useRoute } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../../theme'
import { authenticatedGet, mergePeople } from '../../api/client'
import type { StackNavProp } from '../../types/navigation'

type Photo = { id: string; uri: string; date: string; mimeType: string }

export default function PersonView() {
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavProp>()
  const { personName } = route.params
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mergeModalVisible, setMergeModalVisible] = useState(false)
  const [mergeTarget, setMergeTarget] = useState('')
  const [merging, setMerging] = useState(false)

  const colCount = 3
  const gap = 2
  const thumbSize = (width - gap * (colCount - 1)) / colCount

  const fetchPhotos = useCallback(async () => {
    try {
      const data = await authenticatedGet<{
        photos: Photo[]
        nextToken: string | null
      }>(`faces/photos?person=${encodeURIComponent(personName)}&maxKeys=200`)
      setPhotos(data.photos || [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [personName])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  const handleMerge = useCallback(async () => {
    const target = mergeTarget.trim()
    if (!target || target.toLowerCase() === personName.toLowerCase()) return
    setMerging(true)
    try {
      await mergePeople(personName, target)
      Alert.alert('Fusionado', `Todas las caras de "${personName}" se han fusionado en "${target}"`)
      setMergeModalVisible(false)
      setMergeTarget('')
      navigation.goBack()
    } catch {
      Alert.alert('Error', 'No se pudo fusionar')
    } finally {
      setMerging(false)
    }
  }, [mergeTarget, personName, navigation])

  useEffect(() => {
    navigation.setOptions({
      title: personName,
      headerRight: () => (
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => setMergeModalVisible(true)}
          style={{ marginRight: 4 }}
        >
          <Icon name="merge-type" size={22} color="#fff" />
        </TouchableOpacity>
      ),
    })
  }, [navigation, personName])

  const handlePhotoPress = useCallback(
    (index: number) => {
      const items = photos.map((p) => ({ uri: p.uri, id: p.id }))
      navigation.navigate('PhotoPreview', { photos: items, initialIndex: index })
    },
    [photos, navigation],
  )

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        numColumns={colCount}
        contentContainerStyle={[
          styles.grid,
          photos.length === 0 && styles.emptyGrid,
        ]}
        columnWrapperStyle={photos.length > 0 ? { gap } : undefined}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handlePhotoPress(index)}
            style={{ marginBottom: gap }}
          >
            <NitroImage
              image={{ url: item.uri }}
              style={[styles.thumb, { width: thumbSize, height: thumbSize, backgroundColor: colors.skeleton }]}
              resizeMode="cover"
              recyclingKey={item.id}
            />
            {item.mimeType?.startsWith('video/') && (
              <View style={styles.videoBadge}>
                <Icon name="play-arrow" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="face" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay fotos de {personName}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchPhotos()
            }}
            tintColor={colors.primary}
          />
        }
      />

      <Modal
        visible={mergeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMergeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Fusionar {personName} con...
            </Text>
            <Text style={[styles.modalHint, { color: colors.textTertiary }]}>
              Todas las caras de "{personName}" pasarán a la persona que indiques. No se puede deshacer.
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Nombre de la persona destino"
              placeholderTextColor={colors.textTertiary}
              value={mergeTarget}
              onChangeText={setMergeTarget}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => {
                  setMergeModalVisible(false)
                  setMergeTarget('')
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.danger || '#e74c3c' }]}
                onPress={handleMerge}
                disabled={merging || !mergeTarget.trim()}
              >
                {merging ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Fusionar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  grid: { padding: 2, flexGrow: 1 },
  emptyGrid: { justifyContent: 'center', alignItems: 'center' },
  thumb: { borderRadius: 2 },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, marginTop: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    borderRadius: 14,
    padding: 20,
    maxWidth: 340,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  modalHint: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
})

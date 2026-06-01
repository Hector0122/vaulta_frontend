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
} from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import { useNavigation, useRoute } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../../theme'
import { authenticatedGet } from '../../api/client'
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

  useEffect(() => {
    navigation.setOptions({ title: personName })
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
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={colCount}
      contentContainerStyle={[
        styles.grid,
        { backgroundColor: colors.background },
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
})

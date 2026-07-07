import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  Platform,
  useWindowDimensions,
  ScrollView,
  FlatList,
  Animated,
} from 'react-native'
import { PanGestureHandler, State as GestureState } from 'react-native-gesture-handler'
import {
  RouteProp,
  useRoute,
  useNavigation,
  StackActions,
} from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'
import { useAuth } from '../../context/AuthContext'
import ZoomableImage from '../../components/ZoomableImage'
import VideoPlayer from '../../components/VideoPlayer'
import {
  getPhotoUrl,
  getPhotoDetail,
  deletePhoto,
  toggleFavorite,
  togglePrivate,
  addTag,
  removeTag,
  addPhotosToAlbum,
  authenticatedGet,
  getPhotoAlbums,
  getToken,
} from '../../api/client'
import { BASE_URL } from '../../api/server'
import { impactLight, success, warning } from '../../utils/haptics'
import {
  isCached,
  cachePhoto,
  removeCachedPhoto,
  offlinePath,
} from '../../api/offline'
import {
  addPhotoToWidget,
  removePhotoFromWidget,
  getWidgetPhotoIds,
} from '../../api/widget'

type PhotoItem = {
  uri: string
  fullUri: string
  largeUri?: string | null
  id: string
  tags?: string[]
  mimeType?: string
}

type PhotoPreviewRouteProp = RouteProp<
  { PhotoPreview: { photos: PhotoItem[]; initialIndex: number } },
  'PhotoPreview'
>

const PhotoPage = React.memo(function PhotoPage({
  item,
  onDelete,
  onFavoriteToggle,
  userId,
  isActive,
}: {
  item: PhotoItem
  onDelete: (f: string) => void
  onFavoriteToggle: (id: string) => void
  userId: string
  isActive: boolean
}) {
  const [fullUri, setFullUri] = useState<string | null>(item.fullUri || null)
  const [largeUri, setLargeUri] = useState<string | null>(item.largeUri || null)
  const [thumbUri, setThumbUri] = useState<string | null>(null)
  const [videoHeaders, setVideoHeaders] = useState<
    Record<string, string> | undefined
  >(undefined)
  const [showAlbumPicker, setShowAlbumPicker] = useState(false)
  const [albums, setAlbums] = useState<
    { id: string; name: string; _count: { photos: number } }[]
  >([])
  const [_loading, setLoading] = useState(true)
  const [isFav, setIsFav] = useState(false)
  const [tags, setTags] = useState<string[]>(item.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [offlineCached, setOfflineCached] = useState(false)
  const [offlineLoading, setOfflineLoading] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [containingAlbums, setContainingAlbums] = useState<
    { id: string; name: string; vault: boolean }[]
  >([])
  const [inWidget, setInWidget] = useState(false)
  const [imageReady, setImageReady] = useState(false)
  const loadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isActive) {
      setLoading(false)
      return
    }
    if (loadedRef.current === item.id) return
    loadedRef.current = item.id
    setImageReady(false)
    setLoading(true)
    if (item.fullUri) setFullUri(item.fullUri)
    getWidgetPhotoIds().then(ids => setInWidget(ids.includes(item.id)))
    if (item.mimeType?.startsWith('video/')) {
      setThumbUri(item.uri)
      getPhotoDetail(item.id)
        .then(({ url, albums: photoAlbums }) => {
          setFullUri(url)
          setContainingAlbums(photoAlbums)
          setImageReady(true)
        })
        .catch(() => {
          setFullUri(item.fullUri || `${BASE_URL}/photos/${item.id}/stream`)
          getToken().then(token => {
            if (token) setVideoHeaders({ Authorization: `Bearer ${token}` })
          })
          setImageReady(true)
        })
        .finally(() => setLoading(false))
    } else {
      if (item.largeUri) {
        setLargeUri(item.largeUri)
        setImageReady(true)
      } else if (item.fullUri) {
        setImageReady(true)
      }
      getPhotoDetail(item.id)
        .then(({ url, largeUri: newLargeUri, albums: photoAlbums }) => {
          if (newLargeUri) {
            setLargeUri(newLargeUri)
            setImageReady(true)
          } else if (url) {
            setFullUri(url)
            setImageReady(true)
          }
          setContainingAlbums(photoAlbums)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    isCached(userId, item.id).then(setOfflineCached)
  }, [item.id, item.uri, userId, item.mimeType, isActive])

  const handleToggleFav = async () => {
    try {
      const fav = await toggleFavorite(item.id)
      setIsFav(fav)
      impactLight()
      onFavoriteToggle(item.id)
    } catch {
      Alert.alert('Error', 'No se pudo cambiar favorito')
    }
  }

  const handleDownload = async () => {
    const uri = fullUri || item.uri
    const isVideo = item.mimeType?.startsWith('video/')
    const ext = isVideo ? 'mp4' : Platform.OS === 'android' ? 'jpg' : 'JPEG'
    try {
      const dest = `${RNFS.DocumentDirectoryPath}/download_${Date.now()}.${ext}`
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      await RNFS.downloadFile({ fromUrl: uri, toFile: dest, headers }).promise
      if (Platform.OS === 'android') await RNFS.scanFile(dest)
      success()
      Alert.alert('Descargado', `Archivo guardado en ${dest}`)
    } catch {
      Alert.alert('Error', 'No se pudo descargar el archivo')
    }
  }

  const handleShare = async () => {
    const uri = fullUri || item.uri
    const isVideo = item.mimeType?.startsWith('video/')
    const ext = isVideo ? 'mp4' : Platform.OS === 'android' ? 'jpg' : 'JPEG'
    try {
      const localPath = `${RNFS.CachesDirectoryPath}/share_${Date.now()}.${ext}`
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      await RNFS.downloadFile({ fromUrl: uri, toFile: localPath, headers })
        .promise
      await Share.open({
        url: Platform.OS === 'android' ? `file://${localPath}` : localPath,
        type: isVideo ? 'video/mp4' : 'image/jpeg',
      })
    } catch {
      Alert.alert('Error', 'No se pudo compartir el archivo')
    }
  }

  const handleOfflineToggle = async () => {
    if (offlineLoading) return
    setOfflineLoading(true)
    try {
      if (offlineCached) {
        await removeCachedPhoto(userId, item.id)
        setOfflineCached(false)
      } else {
        let uri: string
        try {
          uri = await getPhotoUrl(item.id)
        } catch {
          Alert.alert('Error', 'No se pudo obtener la URL de la imagen')
          setOfflineLoading(false)
          return
        }
        // Presigned S3 URLs carry auth in query params — do NOT add Authorization header
        await cachePhoto(userId, item.id, uri)
        setOfflineCached(true)
      }
    } catch {
      Alert.alert('Error', 'No se pudo gestionar el archivo offline')
    } finally {
      setOfflineLoading(false)
    }
  }

  const handleTogglePrivate = async () => {
    const nonVault = containingAlbums.filter(a => !a.vault)
    if (!isPrivate && nonVault.length > 0) {
      const names = nonVault.map(a => `"${a.name}"`).join(', ')
      Alert.alert(
        'No disponible',
        `Esta foto está en ${names} y no puede ser privada. Quítala del álbum primero.`,
      )
      return
    }
    try {
      const res = await togglePrivate(item.id)
      setIsPrivate(res.private)
      if (!res.private) {
        getPhotoAlbums(item.id)
          .then(setContainingAlbums)
          .catch(() => {})
      }
    } catch {
      Alert.alert('Error', 'No se pudo cambiar privacidad')
    }
  }

  const handleToggleWidget = async () => {
    try {
      if (inWidget) {
        await removePhotoFromWidget(item.id)
        setInWidget(false)
        warning()
      } else {
        await addPhotoToWidget(item.id, item.uri)
        setInWidget(true)
        success()
      }
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el widget')
    }
  }

  const handleDelete = () => {
    warning()
    Alert.alert('Eliminar foto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePhoto(item.id)
            onDelete(item.id)
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la foto')
          }
        },
      },
    ])
  }

  const handleAddTag = async () => {
    const t = tagInput.trim()
    if (!t) return
    try {
      const result = await addTag(item.id, t)
      setTags(result.tags)
      setTagInput('')
      if (result.linkedPerson) {
        setTimeout(() => {
          Alert.alert(
            'Persona encontrada',
            `"${result.linkedPerson}" también es una persona registrada en Personas.`,
          )
        }, 300)
      }
    } catch {
      Alert.alert('Error', 'No se pudo añadir la etiqueta')
    }
  }

  const handleRemoveTag = async (tag: string) => {
    try {
      const updated = await removeTag(item.id, tag)
      setTags(updated)
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la etiqueta')
    }
  }

  const handleOpenAlbumPicker = async () => {
    try {
      const data = await authenticatedGet<
        { id: string; name: string; _count: { photos: number } }[]
      >('albums')
      setAlbums(data)
      setShowAlbumPicker(true)
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los álbumes')
    }
  }

  const handleAddToAlbum = async (albumId: string) => {
    try {
      const res = await addPhotosToAlbum(albumId, [item.id])
      setShowAlbumPicker(false)
      if (res.alreadyInAlbum > 0 && res.added === 0) {
        Alert.alert('Ya está', 'Esta foto ya está en el álbum')
      } else {
        Alert.alert('Hecho', 'Foto agregada al álbum')
      }
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('Unique') || msg.includes('already')) {
        Alert.alert('Ya está', 'Esta foto ya está en el álbum')
      } else {
        Alert.alert('Error', 'No se pudo agregar la foto')
      }
    }
  }

  return (
    <View style={pageStyles.container}>
      {item.mimeType?.startsWith('video/') ? (
        <VideoPlayer
          uri={
            offlineCached ? `file://${offlinePath(userId, item.id)}` : (fullUri ?? item.uri)
          }
          headers={videoHeaders}
          posterUri={thumbUri || undefined}
        />
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: item.uri }}
            style={StyleSheet.absoluteFill}
            blurRadius={8}
            resizeMode="cover"
          />
          {imageReady && (
            <ZoomableImage
              uri={
                offlineCached
                  ? `file://${offlinePath(userId, item.id)}`
                  : largeUri ?? fullUri ?? item.uri
              }
            />
          )}
        </View>
      )}
      {tags.length > 0 && (
        <View style={pageStyles.tagRow}>
          {tags.map(t => (
            <TouchableOpacity
              key={t}
              style={pageStyles.tagChip}
              onPress={() => handleRemoveTag(t)}
            >
              <Text style={pageStyles.tagText}>{t} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={pageStyles.tagInputRow}>
        <TextInput
          style={pageStyles.tagInput}
          placeholder="Añadir etiqueta..."
          placeholderTextColor="#999"
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
        />
      </View>
      <View style={pageStyles.actions}>
        <TouchableOpacity style={pageStyles.button} onPress={handleDownload}>
          <Icon name="download" size={22} color="#fff" />
          <Text style={pageStyles.label}>Descargar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pageStyles.button} onPress={handleShare}>
          <Icon name="share" size={22} color="#fff" />
          <Text style={pageStyles.label}>Compartir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={pageStyles.button}
          onPress={handleOpenAlbumPicker}
        >
          <Icon name="photo-album" size={22} color="#4fc3f7" />
          <Text style={pageStyles.label}>Álbum</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={pageStyles.button}
          onPress={handleOfflineToggle}
        >
          <Icon
            name={offlineCached ? 'cloud-download' : 'cloud-off'}
            size={22}
            color="#4fc3f7"
          />
          <Text style={pageStyles.label}>
            {offlineCached ? 'Offline' : 'Guardar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={pageStyles.button}
          onPress={handleToggleWidget}
        >
          <Icon
            name={inWidget ? 'smartphone' : 'smartphone'}
            size={22}
            color={inWidget ? '#2BD4CE' : '#fff'}
          />
          <Text style={pageStyles.label}>
            {inWidget ? 'Widget' : 'Widget +'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={pageStyles.button} onPress={handleToggleFav}>
          <Icon
            name={isFav ? 'favorite' : 'favorite-border'}
            size={22}
            color="#ff4081"
          />
          <Text style={pageStyles.label}>Favorito</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={pageStyles.button}
          onPress={handleTogglePrivate}
        >
          <Icon
            name={isPrivate ? 'visibility-off' : 'visibility'}
            size={22}
            color={isPrivate ? '#ffa726' : '#fff'}
          />
          <Text style={pageStyles.label}>
            {isPrivate ? 'Privada' : 'Pública'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[pageStyles.button, pageStyles.deleteButton]}
          onPress={handleDelete}
        >
          <Icon name="delete" size={22} color="#fff" />
          <Text style={pageStyles.label}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      {showAlbumPicker && (
        <View style={pageStyles.modalOverlay}>
          <View
            style={[pageStyles.modalContent, pageStyles.modalContentDark]}
          >
            <View style={pageStyles.modalHeader}>
              <Text style={pageStyles.modalTitle}>Añadir a álbum</Text>
              <TouchableOpacity onPress={() => setShowAlbumPicker(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {albums.length === 0 ? (
              <View style={pageStyles.emptyAlbumsContainer}>
                <Text style={pageStyles.emptyAlbumsText}>
                  No hay álbumes. Crea uno desde la pestaña Álbumes.
                </Text>
              </View>
            ) : (
              <ScrollView>
                {albums.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[pageStyles.albumRow, pageStyles.albumRowBorder]}
                    onPress={() => handleAddToAlbum(a.id)}
                  >
                    <Icon name="photo-album" size={22} color="#4fc3f7" />
                    <Text style={pageStyles.albumRowName}>{a.name}</Text>
                    <Text style={pageStyles.albumRowCount}>
                      {a._count.photos} fotos
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </View>
  )
}

)

const pageStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1 },
  image: { flex: 1 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
  },
  tagChip: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: { color: '#ccc', fontSize: 13 },
  tagInputRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 14,
    paddingHorizontal: 4,
    backgroundColor: '#111',
  },
  button: {
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    minWidth: 48,
  },
  deleteButton: {},
  label: { color: '#fff', fontSize: 10, marginTop: 3 },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  albumRowName: { fontSize: 15, fontWeight: '500', color: '#fff', flex: 1 },
  albumRowCount: { fontSize: 13, color: '#999' },
  modalContentDark: { backgroundColor: '#1a1a1a' },
  emptyAlbumsContainer: { padding: 32, alignItems: 'center' },
  emptyAlbumsText: { color: '#999', fontSize: 15 },
  albumRowBorder: { borderBottomColor: '#333' },
  scrollView: { flex: 1 },
})

export default function PhotoPreview() {
  const { user } = useAuth()
  const route = useRoute<PhotoPreviewRouteProp>()
  const navigation = useNavigation()
  const { width: screenWidth } = useWindowDimensions()
  const { photos: initialPhotos, initialIndex } = route.params
  const [items, setItems] = useState(initialPhotos)
  const [activeIndex, setActiveIndex] = useState(initialIndex || 0)
  const scrollRef = useRef<FlatList<PhotoItem>>(null)

  const dismissTranslateY = useRef(new Animated.Value(0)).current
  const dismissOpacity = dismissTranslateY.interpolate({
    inputRange: [0, 100, 600],
    outputRange: [1, 0.95, 0],
    extrapolate: 'clamp',
  })

  const onDismissGesture = Animated.event(
    [{ nativeEvent: { translationY: dismissTranslateY } }],
    { useNativeDriver: true },
  )

  const handleDismissStateChange = useCallback(
    (event: any) => {
      const state = event.nativeEvent.state as number
      const ty = event.nativeEvent.translationY as number
      const vy = event.nativeEvent.velocityY as number
      if (state === GestureState.END || state === GestureState.CANCELLED || state === GestureState.FAILED) {
        if (ty > 100 || vy > 500) {
          Animated.timing(dismissTranslateY, {
            toValue: 700,
            duration: 200,
            useNativeDriver: true,
          }).start(() => navigation.dispatch(StackActions.pop(1)))
        } else {
          Animated.spring(dismissTranslateY, {
            toValue: 0,
            friction: 6,
            useNativeDriver: true,
          }).start()
        }
      }
    },
    [dismissTranslateY, navigation],
  )
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      const first = viewableItems[0]
      if (first) setActiveIndex(first.index ?? 0)
    },
    [],
  )

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current

  useEffect(() => {
    if (activeIndex < items.length - 1) {
      const next = items[activeIndex + 1]
      const nextUri = next.largeUri || next.fullUri
      if (nextUri) Image.prefetch(nextUri)
    }
    if (activeIndex > 0) {
      const prev = items[activeIndex - 1]
      const prevUri = prev.largeUri || prev.fullUri
      if (prevUri) Image.prefetch(prevUri)
    }
  }, [activeIndex, items])

  const handleDelete = useCallback(
    (id: string) => {
      const remaining = items.filter(i => i.id !== id)
      if (remaining.length === 0) {
        navigation.dispatch(StackActions.pop(1))
        return
      }
      const _deletedIdx = items.findIndex(i => i.id === id)
      setItems(remaining)
    },
    [items, navigation],
  )

  const handleFavoriteToggle = useCallback((id: string) => {
    setItems(prev => prev.map(p => p.id === id ? { ...p, favorite: !(p as any).favorite } : p))
  }, [])

  return (
    <PanGestureHandler
      onGestureEvent={onDismissGesture}
      onHandlerStateChange={handleDismissStateChange}
      activeOffsetY={[-20, 20]}
      failOffsetX={[-20, 20]}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: '#000',
          transform: [{ translateY: dismissTranslateY }],
          opacity: dismissOpacity,
        }}
      >
        <FlatList
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={pageStyles.scrollView}
          data={items}
          keyExtractor={(item: PhotoItem) => item.id}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          windowSize={3}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }: { item: PhotoItem; index: number }) => (
            <View style={{ width: screenWidth }}>
              <PhotoPage
                item={item}
                onDelete={handleDelete}
                onFavoriteToggle={handleFavoriteToggle}
                userId={user?.id || ''}
                isActive={index === activeIndex}
              />
            </View>
          )}
        />
      </Animated.View>
    </PanGestureHandler>
  )
}

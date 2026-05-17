import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator,
  RefreshControl, Alert, Platform, TouchableOpacity,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { NitroImage } from 'react-native-nitro-image'
import Icon from 'react-native-vector-icons/MaterialIcons'
import '../../utils/calendarLocales'
import { StackNavigationProp } from '@react-navigation/stack'
import { useFocusEffect } from '@react-navigation/native'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'

import { fetchPhotosPage, deletePhoto, authenticatedGet, addPhotosToAlbum } from '../../api/client'
import { launchImageLibrary, launchCamera } from 'react-native-image-picker'
import { loadCachedPhotos, saveCachedPhotos } from '../../api/cache'
import { getCachedIds } from '../../api/offline'
import { updateWidgetWithRecentPhotos } from '../../api/widget'
import { useAuth } from '../../context/AuthContext'
import { impactLight, warning } from '../../utils/haptics'
import { useTheme } from '../../theme'
import { SkeletonPhotoGrid } from '../../components/Skeleton'
import FilterBar from '../../components/FilterBar'
import DateRangePicker from '../../components/DateRangePicker'
import RecuerdosSection from '../../components/RecuerdosSection'
import { getApp } from '@react-native-firebase/app'
import { getMessaging, onMessage as onFCMessage } from '@react-native-firebase/messaging'
import SelectionBar from '../../components/SelectionBar'
import FABMenu from '../../components/FABMenu'
import AlbumPickerModal from '../../components/AlbumPickerModal'
import type { Photo, ListItem } from './utils'
import { flattenWithHeaders } from './utils'

type HomeStackParamList = {
  Main: undefined
  Upload: { imageUri?: string }
  PhotoPreview: { photos: { uri: string; id: string; tags?: string[]; mimeType?: string }[]; initialIndex: number }
  Profile: undefined
}

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Main'>
type Props = { navigation: HomeScreenNavigationProp }

function dateRange(start?: string | null, end?: string | null): { dateFrom?: string; dateTo?: string } {
  if (!start && !end) return {}
  return {
    dateFrom: start ? new Date(start + 'T00:00:00').toISOString() : undefined,
    dateTo: end ? new Date(end + 'T23:59:59').toISOString() : undefined,
  }
}

export function HomeScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme()
  const { user } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUris, setSelectedUris] = useState<string[]>([])
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [rangeEnd, setRangeEnd] = useState<string | null>(null)
  const [showRangePicker, setShowRangePicker] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [blurryOnly, setBlurryOnly] = useState(false)
  const [privateOnly, setPrivateOnly] = useState(false)
  const [offlineIds, setOfflineIds] = useState<string[]>([])
  const [showAlbumPicker, setShowAlbumPicker] = useState(false)
  const [albums, setAlbums] = useState<{ id: string; name: string; _count: { photos: number } }[]>([])
  const [recuerdos, setRecuerdos] = useState<
    { year: number; uri: string; id: string; filename: string; count: number; yearsAgo: number; mimeType?: string }[]
  >([])
  const [showFabMenu, setShowFabMenu] = useState(false)
  const loadPhotosRef = useRef<() => void>(() => {})

  useEffect(() => {
    const messaging = getMessaging(getApp())
    const unsubscribe = onFCMessage(messaging, () => {
      loadPhotosRef.current()
    })
    return unsubscribe
  }, [])

  const hasCache = useRef(false)
  const favoritesOnlyRef = useRef(favoritesOnly)
  const blurryOnlyRef = useRef(blurryOnly)
  const privateOnlyRef = useRef(privateOnly)
  const rangeStartRef = useRef(rangeStart)
  const rangeEndRef = useRef(rangeEnd)

  useEffect(() => { favoritesOnlyRef.current = favoritesOnly }, [favoritesOnly])
  useEffect(() => { blurryOnlyRef.current = blurryOnly }, [blurryOnly])
  useEffect(() => { privateOnlyRef.current = privateOnly }, [privateOnly])
  useEffect(() => { rangeStartRef.current = rangeStart }, [rangeStart])
  useEffect(() => { rangeEndRef.current = rangeEnd }, [rangeEnd])

  const selecting = selectedUris.length > 0

  const uriToId = useMemo(() => Object.fromEntries(photos.map(p => [p.uri, p.id])), [photos])
  const uriToFav = useMemo(() => Object.fromEntries(photos.map(p => [p.uri, p.favorite])), [photos])
  const uriToBlurred = useMemo(() => Object.fromEntries(photos.map(p => [p.uri, p.blurred])), [photos])
  const uriToPrivate = useMemo(() => Object.fromEntries(photos.map(p => [p.uri, p.private])), [photos])
  const uriToOffline = useMemo(
    () => Object.fromEntries(photos.map(p => [p.uri, offlineIds.includes(p.id)])),
    [photos, offlineIds],
  )

  const selectedIds = selectedUris.map(uri => uriToId[uri]).filter(Boolean)

  const clearSelection = useCallback(() => setSelectedUris([]), [])
  const toggleSelection = useCallback((uri: string) => {
    setSelectedUris(prev => prev.includes(uri) ? prev.filter(u => u !== uri) : [...prev, uri])
  }, [])

  const handlePressImage = useCallback((data: { uri: string }) => {
    if (selecting) {
      toggleSelection(data.uri)
    } else {
      const allPhotos = photos.map(p => ({ uri: p.uri, id: p.id, tags: p.tags, mimeType: p.mimeType }))
      const idx = allPhotos.findIndex(p => p.uri === data.uri)
      navigation.navigate('PhotoPreview', { photos: allPhotos, initialIndex: Math.max(idx, 0) })
    }
  }, [selecting, photos, navigation, toggleSelection])

  const handleLongPressImage = useCallback((data: { uri: string }) => {
    if (!selecting) {
      impactLight()
      setSelectedUris([data.uri])
    }
  }, [selecting])

  const handleBatchDelete = () => {
    warning()
    Alert.alert(`Eliminar ${selectedIds.length} foto(s)`, '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await Promise.allSettled(selectedIds.map(deletePhoto))
          clearSelection()
          loadPhotos()
        },
      },
    ])
  }

  const handleBatchDownload = async () => {
    const timestamp = Date.now()
    const results = await Promise.allSettled(
      selectedUris.map(async (uri, i) => {
        const ext = Platform.OS === 'android' ? 'jpg' : 'JPEG'
        const dest = `${RNFS.DocumentDirectoryPath}/download_${timestamp}_${i}.${ext}`
        await RNFS.downloadFile({ fromUrl: uri, toFile: dest }).promise
        if (Platform.OS === 'android') await RNFS.scanFile(dest)
      }),
    )
    const ok = results.filter(r => r.status === 'fulfilled').length
    Alert.alert('Descargadas', `${ok} de ${selectedIds.length} foto(s) guardada(s)`)
    clearSelection()
  }

  const handleBatchShare = async () => {
    try { await Share.open({ urls: selectedUris, type: 'image/jpeg' }) } catch {}
    clearSelection()
  }

  const loadPhotos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setError(null)

    const favOnly = favoritesOnlyRef.current
    const blOnly = blurryOnlyRef.current
    const privOnly = privateOnlyRef.current
    const dr = dateRange(rangeStartRef.current, rangeEndRef.current)
    const hasFilter = !!favOnly || !!blOnly || !!privOnly || !!dr.dateFrom || !!dr.dateTo

    if (!isRefresh && !hasFilter && user?.id) {
      const cached = await loadCachedPhotos(user.id)
      if (cached) {
        hasCache.current = true
        setPhotos(cached)
        setLoading(false)
      }
    }

    try {
      const data = await fetchPhotosPage(undefined, 50, undefined, favOnly, blOnly, privOnly, dr.dateFrom, dr.dateTo)
      setPhotos(data.photos)
      setNextToken(data.nextToken)
      setHasMore(data.nextToken !== null)
      if (!hasFilter && user?.id) saveCachedPhotos(user.id, data.photos)
      hasCache.current = true
    } catch {
      if (!hasCache.current) setError('No se pudieron cargar las fotos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])
  loadPhotosRef.current = loadPhotos

  const loadMorePhotos = useCallback(async () => {
    if (loadingMore || !hasMore || !nextToken) return
    setLoadingMore(true)
    const dr = dateRange(rangeStartRef.current, rangeEndRef.current)
    try {
      const data = await fetchPhotosPage(nextToken, 50, undefined, favoritesOnlyRef.current, blurryOnlyRef.current, privateOnlyRef.current, dr.dateFrom, dr.dateTo)
      setPhotos(prev => [...prev, ...data.photos])
      setNextToken(data.nextToken)
      setHasMore(data.nextToken !== null)
    } catch {}
    setLoadingMore(false)
  }, [loadingMore, hasMore, nextToken])

  const fetchRecuerdos = useCallback(async () => {
    try {
      const data = await authenticatedGet<{ year: number; uri: string; id: string; filename: string; count: number; yearsAgo: number }[]>('photos/this-day')
      setRecuerdos(data)
    } catch {}
  }, [])

  const onRefresh = useCallback(() => loadPhotos(true), [loadPhotos])

  useFocusEffect(useCallback(() => {
    clearSelection()
    loadPhotos()
    if (user?.id) getCachedIds(user.id).then(setOfflineIds)
    fetchRecuerdos()
    updateWidgetWithRecentPhotos()
  }, [loadPhotos, clearSelection, user?.id, fetchRecuerdos]))

  const listData = useMemo(() => flattenWithHeaders(photos), [photos])

  const setDateFilter = useCallback((start: string | null, end: string | null) => {
    rangeStartRef.current = start
    rangeEndRef.current = end
    setRangeStart(start)
    setRangeEnd(end)
    setNextToken(null)
    setHasMore(true)
    loadPhotos()
  }, [loadPhotos])

  const handleDayPress = useCallback((day: { dateString: string }) => {
    if (!rangeStartRef.current || (rangeStartRef.current && rangeEndRef.current)) {
      rangeStartRef.current = day.dateString
      rangeEndRef.current = null
      setRangeStart(day.dateString)
      setRangeEnd(null)
    } else {
      if (day.dateString < rangeStartRef.current) {
        rangeEndRef.current = rangeStartRef.current
        rangeStartRef.current = day.dateString
        setRangeEnd(rangeStartRef.current)
        setRangeStart(day.dateString)
      } else {
        rangeEndRef.current = day.dateString
        setRangeEnd(day.dateString)
      }
      setShowRangePicker(false)
      setNextToken(null)
      setHasMore(true)
      loadPhotos()
    }
  }, [loadPhotos])

  const handleSelectToday = useCallback(() => {
    setDateFilter(rangeStart, rangeStart)
    setShowRangePicker(false)
  }, [rangeStart, setDateFilter])

  const handleClearDateRange = useCallback(() => {
    setDateFilter(null, null)
  }, [setDateFilter])

  const toggleFilter = useCallback((filter: 'favorites' | 'blurry') => {
    const setter = filter === 'favorites' ? setFavoritesOnly : setBlurryOnly
    const ref = filter === 'favorites' ? favoritesOnlyRef : blurryOnlyRef
    setter(v => {
      const next = !v
      ref.current = next
      return next
    })
    setNextToken(null)
    setHasMore(true)
    loadPhotos()
  }, [loadPhotos])

  const handleSelectAlbum = useCallback(async (album: { id: string }) => {
    try {
      const res = await addPhotosToAlbum(album.id, selectedIds)
      setShowAlbumPicker(false)
      clearSelection()
      if (res.alreadyInAlbum > 0 && res.added === 0) {
        Alert.alert('Ya están', 'Todas las fotos ya estaban en el álbum')
      } else if (res.alreadyInAlbum > 0) {
        Alert.alert('Hecho', `${res.added} agregada(s) (${res.alreadyInAlbum} ya estaban)`)
      } else {
        Alert.alert('Hecho', 'Agregadas al álbum')
      }
    } catch {
      Alert.alert('Error', 'No se pudieron agregar las fotos')
    }
  }, [selectedIds, clearSelection])

  const handleOpenAlbumPicker = useCallback(async () => {
    try {
      const data = await authenticatedGet<{ id: string; name: string; _count: { photos: number } }[]>('albums')
      setAlbums(data)
      setShowAlbumPicker(true)
    } catch { Alert.alert('Error', 'No se pudieron cargar los álbumes') }
  }, [])

  const renderRecuerdos = useCallback(() => (
    <RecuerdosSection recuerdos={recuerdos} colors={colors}
      onPressRecuerdo={(r) => navigation.navigate('PhotoPreview', { photos: [{ uri: r.uri, id: r.id, mimeType: r.mimeType }], initialIndex: 0 })}
    />
  ), [recuerdos, colors, navigation])

  const renderHeaderContent = useCallback(() => (
    <>
      {selecting && (
        <View style={[styles.selectionHeader, { backgroundColor: colors.surfaceAlt }]}>
          <TouchableOpacity onPress={clearSelection}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[styles.selectionCount, { color: colors.text }]}>
            {selectedUris.length} seleccionada(s)
          </Text>
          <TouchableOpacity onPress={() =>
            setSelectedUris(selectedUris.length === photos.length ? [] : photos.map(p => p.uri))
          }>
            <Text style={{ color: colors.primary, fontSize: 16 }}>
              {selectedUris.length === photos.length ? 'Ninguna' : 'Todo'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FilterBar
        colors={colors}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        favoritesOnly={favoritesOnly}
        blurryOnly={blurryOnly}
        onOpenDatePicker={() => setShowRangePicker(true)}
        onClearDateRange={handleClearDateRange}
        onToggleFavorites={() => toggleFilter('favorites')}
        onToggleBlurry={() => toggleFilter('blurry')}
        onGoToProfile={() => navigation.navigate('Profile')}
      />
    </>
  ), [
    selecting, colors, clearSelection, selectedUris, photos,
    rangeStart, rangeEnd, favoritesOnly, blurryOnly,
    handleClearDateRange, toggleFilter, navigation,
  ])

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <SkeletonPhotoGrid colors={colors} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error || photos.length === 0 ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          {renderHeaderContent()}
          <DateRangePicker
            visible={showRangePicker}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            colors={colors}
            onDayPress={handleDayPress}
            onSelectToday={handleSelectToday}
            onClose={() => setShowRangePicker(false)}
          />
          {renderRecuerdos()}
          {error ? (
            <View style={styles.stateContainer}>
              <Icon name="error-outline" size={56} color={colors.textTertiary} />
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => loadPhotos()}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="photo-library" size={72} color={colors.textTertiary} />
              {(rangeStart || favoritesOnly || blurryOnly) ? (
                <>
                  <Text style={[styles.stateText, { color: colors.textSecondary }]}>Sin resultados</Text>
                  <Text style={[styles.stateSubtext, { color: colors.textTertiary }]}>No hay fotos que coincidan con este filtro</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.stateText, { color: colors.textSecondary }]}>No hay fotos aún</Text>
                  <Text style={[styles.stateSubtext, { color: colors.textTertiary }]}>Sube tu primera foto</Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <FlashList
          style={{ flex: 1 }}
          data={listData}
          keyExtractor={(item: ListItem) => item.key}
          numColumns={2}
          estimatedItemSize={250}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.dateLabel, { color: colors.text }]}>
                    {new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              )
            }
            const photo = item.photo
            const uri = photo.uri
            const selected = selectedUris.includes(uri)
            const isFav = !selected && uriToFav[uri]
            const isOffline = !selected && !isFav && uriToOffline[uri]
            const isBlurry = !selected && uriToBlurred[uri]
            const isPrivate = !selected && uriToPrivate[uri]
            return (
              <View style={{ padding: 3, flex: 1 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (selecting) {
                      toggleSelection(uri)
                    } else {
                      handlePressImage({ uri })
                    }
                  }}
                  onLongPress={() => {
                    if (!selecting) handleLongPressImage({ uri })
                  }}
                >
                  <View style={{
                    backgroundColor: colors.surface,
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}>
                    <NitroImage
                      image={{ url: uri }}
                      style={{ width: '100%', height: 250 }}
                      resizeMode="cover"
                      recyclingKey={uri}
                    />
                    {photo.mimeType?.startsWith('video/') && (
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                        <Icon name="play-circle-filled" size={48} color="rgba(255,255,255,0.7)" />
                      </View>
                    )}
                    {isBlurry && (
                      <View style={{ position: 'absolute', top: 4, left: 4 }}>
                        <Icon name="blur-off" size={16} color={colors.danger} />
                      </View>
                    )}
                    {isPrivate && (
                      <View style={{ position: 'absolute', bottom: 24, right: 4 }}>
                        <Icon name="visibility-off" size={16} color="#ffa726" />
                      </View>
                    )}
                    {isOffline && (
                      <View style={{ position: 'absolute', bottom: 4, left: 4 }}>
                        <Icon name="cloud-queue" size={16} color={colors.offline} />
                      </View>
                    )}
                    {isFav && (
                      <View style={{ position: 'absolute', top: 4, right: 4 }}>
                        <Icon name="favorite" size={18} color={colors.favorite} />
                      </View>
                    )}
                    {selected && (
                      <View style={[
                        StyleSheet.absoluteFill,
                        {
                          backgroundColor: colors.overlay,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}>
                        <Icon name="check-circle" size={28} color="#fff" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )
          }}
          ListHeaderComponent={
            <View>
              {renderHeaderContent()}
              <DateRangePicker
                visible={showRangePicker}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                colors={colors}
                onDayPress={handleDayPress}
                onSelectToday={handleSelectToday}
                onClose={() => setShowRangePicker(false)}
              />
              {renderRecuerdos()}
            </View>
          }
          ListFooterComponent={
            <>
              {loadingMore && <View style={{ paddingVertical: 20 }}><ActivityIndicator size="small" color={colors.primary} /></View>}
              {!hasMore && photos.length > 0 && (
                <View style={{ paddingVertical: 12 }}>
                  <Text style={{ textAlign: 'center', color: colors.textTertiary, fontSize: 13 }}>Todas las fotos cargadas</Text>
                </View>
              )}
            </>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          onEndReached={!loadingMore && hasMore ? loadMorePhotos : undefined}
          onEndReachedThreshold={0.5}
          extraData={[selectedUris, uriToFav, uriToBlurred, uriToOffline, uriToPrivate, selecting, colors]}
          overrideItemLayout={(layout, item: ListItem) => {
            if (item.type === 'header') {
              layout.size = 45
              layout.span = 2
            } else {
              layout.size = 256 // 250 image + 3*2 padding
            }
          }}
        />
      )}
      <SelectionBar
        selectedCount={selectedIds.length}
        isDark={isDark}
        colors={colors}
        onDownload={handleBatchDownload}
        onShare={handleBatchShare}
        onAddToAlbum={handleOpenAlbumPicker}
        onDelete={handleBatchDelete}
      />
      {!selecting && (
        <FABMenu
          visible={showFabMenu}
          colors={colors}
          onClose={() => setShowFabMenu(false)}
          onOpenGallery={() => {
            setShowFabMenu(false)
            navigation.navigate('Upload', { imageUri: undefined })
          }}
          onOpenCamera={() => {
            setShowFabMenu(false)
            launchCamera({ mediaType: 'photo', quality: 0.8 }, res => {
              if (res.assets?.[0]?.uri) navigation.navigate('Upload', { imageUri: res.assets[0].uri })
            })
          }}
          onOpenVideo={() => {
            setShowFabMenu(false)
            launchCamera({ mediaType: 'video', videoQuality: 'high', saveToPhotos: true }, res => {
              if (res.assets?.[0]?.uri) navigation.navigate('Upload', { imageUri: res.assets[0].uri })
            })
          }}
          onToggle={() => setShowFabMenu(v => !v)}
        />
      )}
      <AlbumPickerModal
        visible={showAlbumPicker}
        albums={albums}
        colors={colors}
        onClose={() => setShowAlbumPicker(false)}
        onSelectAlbum={handleSelectAlbum}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1 },
  stateContainer: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  stateText: { fontSize: 18, marginTop: 16, textAlign: 'center' },
  stateSubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 16 },
  sectionHeader: { paddingHorizontal: 8, paddingVertical: 6 },
  dateLabel: { fontSize: 18, fontWeight: 'bold' },
  selectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  selectionCount: { fontSize: 16, fontWeight: '600' },
})

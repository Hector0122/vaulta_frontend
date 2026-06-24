import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import type { FlashListRef } from '@shopify/flash-list'

import '../../utils/calendarLocales'
import { StackNavigationProp } from '@react-navigation/stack'
import { useFocusEffect } from '@react-navigation/native'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'

import {
  fetchPhotosPage,
  authenticatedGet,
  addPhotosToAlbum,
  bulkDeletePhotos,
  bulkSetPrivate,
} from '../../api/client'
import { launchCamera } from 'react-native-image-picker'
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
import {
  getMessaging,
  onMessage as onFCMessage,
} from '@react-native-firebase/messaging'
import SelectionBar from '../../components/SelectionBar'
import FABMenu from '../../components/FABMenu'
import AlbumPickerModal from '../../components/AlbumPickerModal'
import type { Photo, ListItem } from './utils'
import { flattenWithHeaders, dateRange } from './utils'
import { PhotoGridItem } from './PhotoGridItem'
import { HomeEmptyState } from './HomeEmptyState'

type HomeStackParamList = {
  Main: undefined
  Upload: { imageUri?: string; imageType?: string }
  PhotoPreview: {
    photos: { uri: string; fullUri: string; largeUri?: string | null; id: string; tags?: string[]; mimeType?: string }[]
    initialIndex: number
  }
  Profile: undefined
  People: undefined
}

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Main'>
type Props = { navigation: HomeScreenNavigationProp }

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
  const [privateOnly, _setPrivateOnly] = useState(false)
  const [offlineIds, setOfflineIds] = useState<string[]>([])
  const [showAlbumPicker, setShowAlbumPicker] = useState(false)
  const [albums, setAlbums] = useState<
    { id: string; name: string; _count: { photos: number } }[]
  >([])
  const [recuerdos, setRecuerdos] = useState<
    {
      year: number
      uri: string
      fullUri: string
      id: string
      filename: string
      count: number
      yearsAgo: number
      mimeType?: string
    }[]
  >([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFabMenu, setShowFabMenu] = useState(false)
  const loadPhotosRef = useRef<() => void>(() => {})
  const flashListRef = useRef<FlashListRef<ListItem>>(null)
  const scrollOffsetRef = useRef(0)
  const scrollRestoreRef = useRef(0)
  const lastLoadTimeRef = useRef(0)

  useEffect(() => {
    const messaging = getMessaging(getApp())
    const unsubscribe = onFCMessage(messaging, () => {
      loadPhotosRef.current()
    })
    return unsubscribe
  }, [])

  const hasCache = useRef(false)
  const favoritesOnlyRef = useRef(favoritesOnly)
  const privateOnlyRef = useRef(privateOnly)
  const rangeStartRef = useRef(rangeStart)
  const rangeEndRef = useRef(rangeEnd)
  const searchRef = useRef<string>('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    favoritesOnlyRef.current = favoritesOnly
  }, [favoritesOnly])
  useEffect(() => {
    privateOnlyRef.current = privateOnly
  }, [privateOnly])
  useEffect(() => {
    rangeStartRef.current = rangeStart
  }, [rangeStart])
  useEffect(() => {
    rangeEndRef.current = rangeEnd
  }, [rangeEnd])

  const selecting = selectedUris.length > 0

  const uriToId = useMemo(
    () => Object.fromEntries(photos.map(p => [p.uri, p.id])),
    [photos],
  )
  const uriToFav = useMemo(
    () => Object.fromEntries(photos.map(p => [p.uri, p.favorite])),
    [photos],
  )
  const uriToBlurred = useMemo(
    () => Object.fromEntries(photos.map(p => [p.uri, p.blurred])),
    [photos],
  )
  const uriToPrivate = useMemo(
    () => Object.fromEntries(photos.map(p => [p.uri, p.private])),
    [photos],
  )
  const uriToOffline = useMemo(
    () =>
      Object.fromEntries(photos.map(p => [p.uri, offlineIds.includes(p.id)])),
    [photos, offlineIds],
  )
  const uriToFullUri = useMemo(
    () => Object.fromEntries(photos.map(p => [p.uri, p.fullUri || p.uri])),
    [photos],
  )

  const selectedIds = selectedUris.map(uri => uriToId[uri]).filter(Boolean)

  const clearSelection = useCallback(() => setSelectedUris([]), [])
  const toggleSelection = useCallback((uri: string) => {
    setSelectedUris(prev =>
      prev.includes(uri) ? prev.filter(u => u !== uri) : [...prev, uri],
    )
  }, [])

  const handlePressImage = useCallback(
    (data: { uri: string }) => {
      if (selecting) {
        toggleSelection(data.uri)
      } else {
        const allPhotos = photos.map(p => ({
          uri: p.uri,
          fullUri: p.fullUri || p.uri,
          largeUri: p.largeUri,
          id: p.id,
          tags: p.tags,
          mimeType: p.mimeType,
        }))
        const idx = allPhotos.findIndex(p => p.uri === data.uri)
        navigation.navigate('PhotoPreview', {
          photos: allPhotos,
          initialIndex: Math.max(idx, 0),
        })
      }
    },
    [selecting, photos, navigation, toggleSelection],
  )

  const handleLongPressImage = useCallback(
    (data: { uri: string }) => {
      if (!selecting) {
        impactLight()
        setSelectedUris([data.uri])
      }
    },
    [selecting],
  )

  const handleBatchDelete = () => {
    warning()
    Alert.alert(`Eliminar ${selectedIds.length} foto(s)`, '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await bulkDeletePhotos(Array.from(selectedIds))
          clearSelection()
          loadPhotos()
        },
      },
    ])
  }

  const handleBatchMakePrivate = () => {
    warning()
    Alert.alert(`Marcar ${selectedIds.length} foto(s) como privada(s)`, 'Las fotos se moverán a la Caja Fuerte', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Privada',
        onPress: async () => {
          try {
            await bulkSetPrivate(Array.from(selectedIds))
            clearSelection()
            loadPhotos()
          } catch {
            Alert.alert('Error', 'No se pudieron marcar como privadas')
          }
        },
      },
    ])
  }

  const handleBatchDownload = async () => {
    const timestamp = Date.now()
    const results = await Promise.allSettled(
      selectedUris.map(async (uri, i) => {
        const fullUri = uriToFullUri[uri] || uri
        const ext = Platform.OS === 'android' ? 'jpg' : 'JPEG'
        const dest = `${RNFS.DocumentDirectoryPath}/download_${timestamp}_${i}.${ext}`
        await RNFS.downloadFile({ fromUrl: fullUri, toFile: dest }).promise
        if (Platform.OS === 'android') await RNFS.scanFile(dest)
      }),
    )
    const ok = results.filter(r => r.status === 'fulfilled').length
    Alert.alert(
      'Descargadas',
      `${ok} de ${selectedIds.length} foto(s) guardada(s)`,
    )
    clearSelection()
  }

  const handleBatchShare = async () => {
    try {
      const fullUrls = selectedUris.map(uri => uriToFullUri[uri] || uri)
      await Share.open({ urls: fullUrls, type: 'image/jpeg' })
    } catch {}
    clearSelection()
  }

  const loadPhotos = useCallback(
    async (isRefresh = false) => {
      lastLoadTimeRef.current = Date.now()
      if (isRefresh) setRefreshing(true)
      else setError(null)

      const favOnly = favoritesOnlyRef.current
      const privOnly = privateOnlyRef.current
      const dr = dateRange(rangeStartRef.current, rangeEndRef.current)
      const hasFilter =
        !!favOnly || !!privOnly || !!dr.dateFrom || !!dr.dateTo

      if (!isRefresh && !hasFilter && user?.id) {
        const cached = await loadCachedPhotos(user.id)
        if (cached) {
          hasCache.current = true
          setPhotos(cached)
          setLoading(false)
        }
      }

      try {
        const data = await fetchPhotosPage({
          maxKeys: 50,
          favoritesOnly: favOnly,
          privateOnly: privOnly,
          dateFrom: dr.dateFrom,
          dateTo: dr.dateTo,
          query: searchRef.current || undefined,
        })
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
        const y = scrollRestoreRef.current
        if (y > 0) {
          scrollRestoreRef.current = 0
          requestAnimationFrame(() => {
            flashListRef.current?.scrollToOffset({
              offset: y,
              animated: false,
            })
          })
        }
      }
    },
    [user?.id],
  )
  loadPhotosRef.current = loadPhotos

  const loadMorePhotos = useCallback(async () => {
    if (loadingMore || !hasMore || !nextToken) return
    setLoadingMore(true)
    const dr = dateRange(rangeStartRef.current, rangeEndRef.current)
    try {
      const data = await fetchPhotosPage({
        pageToken: nextToken,
        maxKeys: 50,
        favoritesOnly: favoritesOnlyRef.current,
        privateOnly: privateOnlyRef.current,
        dateFrom: dr.dateFrom,
        dateTo: dr.dateTo,
        query: searchRef.current || undefined,
      })
      setPhotos(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        const unique = data.photos.filter(p => !existingIds.has(p.id))
        return [...prev, ...unique]
      })
      setNextToken(data.nextToken)
      setHasMore(data.nextToken !== null)
    } catch {}
    setLoadingMore(false)
  }, [loadingMore, hasMore, nextToken])

  const fetchRecuerdos = useCallback(async () => {
    try {
      const data = await authenticatedGet<
        {
          year: number
          uri: string
          fullUri: string
          id: string
          filename: string
          count: number
          yearsAgo: number
        }[]
      >('photos/this-day')
      setRecuerdos(data)
    } catch {}
  }, [])

  const onRefresh = useCallback(() => loadPhotos(true), [loadPhotos])

  useFocusEffect(
    useCallback(() => {
      clearSelection()
      const y = scrollOffsetRef.current
      if (y > 0) {
        requestAnimationFrame(() => {
          flashListRef.current?.scrollToOffset({
            offset: y,
            animated: false,
          })
        })
      }
      if (user?.id) getCachedIds(user.id).then(setOfflineIds)
      fetchRecuerdos()
      updateWidgetWithRecentPhotos()
    }, [clearSelection, user?.id, fetchRecuerdos]),
  )

  const listData = useMemo(() => flattenWithHeaders(photos), [photos])

  const setDateFilter = useCallback(
    (start: string | null, end: string | null) => {
      rangeStartRef.current = start
      rangeEndRef.current = end
      setRangeStart(start)
      setRangeEnd(end)
      setNextToken(null)
      setHasMore(true)
      loadPhotos()
    },
    [loadPhotos],
  )

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      if (
        !rangeStartRef.current ||
        (rangeStartRef.current && rangeEndRef.current)
      ) {
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
    },
    [loadPhotos],
  )

  const handleSelectToday = useCallback(() => {
    setDateFilter(rangeStart, rangeStart)
    setShowRangePicker(false)
  }, [rangeStart, setDateFilter])

  const handleClearDateRange = useCallback(() => {
    setDateFilter(null, null)
  }, [setDateFilter])

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        searchRef.current = q
        setNextToken(null)
        setHasMore(true)
        loadPhotos()
      }, 300)
    },
    [loadPhotos],
  )

  const handleYearPreset = useCallback(
    (from: string, to: string) => {
      rangeStartRef.current = from
      rangeEndRef.current = to
      setRangeStart(from)
      setRangeEnd(to)
      setNextToken(null)
      setHasMore(true)
      loadPhotos()
    },
    [loadPhotos],
  )

  const toggleFilter = useCallback(
    () => {
      setFavoritesOnly(v => {
        const next = !v
        favoritesOnlyRef.current = next
        return next
      })
      setNextToken(null)
      setHasMore(true)
      loadPhotos()
    },
    [loadPhotos],
  )

  const handleSelectAlbum = useCallback(
    async (album: { id: string }) => {
      try {
        const res = await addPhotosToAlbum(album.id, selectedIds)
        setShowAlbumPicker(false)
        clearSelection()
        if (res.alreadyInAlbum > 0 && res.added === 0) {
          Alert.alert('Ya están', 'Todas las fotos ya estaban en el álbum')
        } else if (res.alreadyInAlbum > 0) {
          Alert.alert(
            'Hecho',
            `${res.added} agregada(s) (${res.alreadyInAlbum} ya estaban)`,
          )
        } else {
          Alert.alert('Hecho', 'Agregadas al álbum')
        }
      } catch {
        Alert.alert('Error', 'No se pudieron agregar las fotos')
      }
    },
    [selectedIds, clearSelection],
  )

  const handleOpenAlbumPicker = useCallback(async () => {
    try {
      const data = await authenticatedGet<
        { id: string; name: string; _count: { photos: number } }[]
      >('albums')
      setAlbums(data)
      setShowAlbumPicker(true)
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los álbumes')
    }
  }, [])

  const renderRecuerdos = useCallback(
    () => (
      <RecuerdosSection
        recuerdos={recuerdos}
        colors={colors}
        onPressRecuerdo={r =>
          navigation.navigate('PhotoPreview', {
            photos: [{ uri: r.uri, fullUri: r.fullUri || r.uri, largeUri: r.largeUri, id: r.id, mimeType: r.mimeType }],
            initialIndex: 0,
          })
        }
      />
    ),
    [recuerdos, colors, navigation],
  )

  const renderHeaderContent = useCallback(
    () => (
      <>
        {selecting && (
          <View
            style={[
              styles.selectionHeader,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <TouchableOpacity onPress={clearSelection}>
              <Text style={[styles.selectionAction, { color: colors.primary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <Text style={[styles.selectionCount, { color: colors.text }]}>
              {selectedUris.length} seleccionada(s)
            </Text>
            <TouchableOpacity
              onPress={() =>
                setSelectedUris(
                  selectedUris.length === photos.length
                    ? []
                    : photos.map(p => p.uri),
                )
              }
            >
              <Text style={[styles.selectionAction, { color: colors.primary }]}>
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
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          onOpenDatePicker={() => setShowRangePicker(true)}
          onClearDateRange={handleClearDateRange}
          onToggleFavorites={() => toggleFilter()}
          onGoToProfile={() => navigation.navigate('Profile')}
          onGoToPeople={() => navigation.navigate('People')}
          onYearPreset={handleYearPreset}
        />
      </>
    ),
    [
      selecting,
      colors,
      clearSelection,
      selectedUris,
      photos,
      rangeStart,
      rangeEnd,
      favoritesOnly,
      handleClearDateRange,
      toggleFilter,
      navigation,
      loadPhotos,
    ],
  )

  const extraData = useMemo(
    () => [selectedUris, uriToFav, uriToBlurred, uriToOffline, uriToPrivate, selecting, colors],
    [selectedUris, uriToFav, uriToBlurred, uriToOffline, uriToPrivate, selecting, colors],
  )

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <SkeletonPhotoGrid colors={colors} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error || photos.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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
          <HomeEmptyState
            error={error}
            colors={colors}
            rangeStart={rangeStart}
            favoritesOnly={favoritesOnly}
            loadPhotos={() => loadPhotos()}
          />
        </ScrollView>
      ) : (
        <FlashList
          ref={flashListRef}
          style={styles.flashList}
          data={listData}
          keyExtractor={(item: ListItem) => item.key}
          numColumns={2}
          estimatedItemSize={250}
          scrollEventThrottle={16}
          onScroll={e => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y
          }}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.dateLabel, { color: colors.text }]}>
                    {new Date(item.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              )
            }
            if (item.type === 'photo') {
              const photo = item.photo
              const uri = photo.uri
              const selected = selectedUris.includes(uri)
              const isFav = !selected && uriToFav[uri]
              const isOffline = !selected && !isFav && uriToOffline[uri]
              const isBlurry = !selected && uriToBlurred[uri]
              const isPrivate = !selected && uriToPrivate[uri]
              return (
                <PhotoGridItem
                  photo={photo}
                  selected={selected}
                  isFav={!!isFav}
                  isOffline={!!isOffline}
                  isBlurry={!!isBlurry}
                  isPrivate={!!isPrivate}
                  selecting={selecting}
                  colors={colors}
                  uriToFav={uriToFav}
                  uriToOffline={uriToOffline}
                  uriToBlurred={uriToBlurred}
                  uriToPrivate={uriToPrivate}
                  selectedUris={selectedUris}
                  toggleSelection={toggleSelection}
                  handlePressImage={handlePressImage}
                  handleLongPressImage={handleLongPressImage}
                />
              )
            }
            return null
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
              {loadingMore && (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
              {!hasMore && photos.length > 0 && (
                <View style={styles.allLoadedContainer}>
                  <Text
                    style={[styles.allLoadedText, { color: colors.textTertiary }]}
                  >
                    Todas las fotos cargadas
                  </Text>
                </View>
              )}
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={!loadingMore && hasMore ? loadMorePhotos : undefined}
          onEndReachedThreshold={0.5}
          extraData={extraData}
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
        onMakePrivate={handleBatchMakePrivate}
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
            launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: true }, async res => {
              if (res.assets?.[0]?.uri) {
                let uri = res.assets[0].uri
                if (Platform.OS === 'android' && uri.startsWith('content://')) {
                  const tmp = `${RNFS.CachesDirectoryPath}/capture-${Date.now()}.jpg`
                  try { await RNFS.copyFile(uri, tmp); uri = tmp } catch {}
                }
                navigation.navigate('Upload', { imageUri: uri, imageType: res.assets[0].type || 'image/jpeg' })
              }
            })
          }}
          onOpenVideo={() => {
            setShowFabMenu(false)
            launchCamera(
              { mediaType: 'video', videoQuality: 'high', saveToPhotos: true },
              async res => {
                if (res.assets?.[0]?.uri) {
                  let uri = res.assets[0].uri
                  if (Platform.OS === 'android' && uri.startsWith('content://')) {
                    const tmp = `${RNFS.CachesDirectoryPath}/capture-${Date.now()}.mp4`
                    try { await RNFS.copyFile(uri, tmp); uri = tmp } catch {}
                  }
                  navigation.navigate('Upload', { imageUri: uri, imageType: res.assets[0].type || 'video/mp4' })
                }
              },
            )
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
  sectionHeader: { paddingHorizontal: 8, paddingVertical: 6 },
  dateLabel: { fontSize: 18, fontWeight: 'bold' },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selectionCount: { fontSize: 16, fontWeight: '600' },
  selectionAction: { fontSize: 16 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  flashList: { flex: 1 },
  loadingMoreContainer: { paddingVertical: 20 },
  allLoadedContainer: { paddingVertical: 12 },
  allLoadedText: { textAlign: 'center', fontSize: 13 },
})

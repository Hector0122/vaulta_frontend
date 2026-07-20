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
import Icon from 'react-native-vector-icons/MaterialIcons'

import '../../utils/calendarLocales'
import { StackNavigationProp } from '@react-navigation/stack'
import { useFocusEffect } from '@react-navigation/native'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'

import {
  fetchPhotosPage,
  authenticatedGet,
  addPhotosToAlbum,
  bulkDeletePhotos,
  bulkSetPrivate,
  getToken,
  fetchVaultAlbums,
} from '../../api/client'
import { launchCamera } from 'react-native-image-picker'
import { loadCachedPhotos, saveCachedPhotos } from '../../api/cache'
import { getCachedIds } from '../../api/offline'
import { updateWidgetWithRecentPhotos, addPhotosToWidget } from '../../api/widget'
import { useAuth } from '../../context/AuthContext'
import { impactLight, success, warning } from '../../utils/haptics'
import { requestSaveToGalleryPermission, promptOpenSettings } from '../../utils/permissions'
import { isPresignedUrl } from '../../utils/urls'
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
import SelectDateRangeModal from '../../components/SelectDateRangeModal'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
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
  const [showSelectRangeModal, setShowSelectRangeModal] = useState(false)
  const [rangeSelectLoading, setRangeSelectLoading] = useState(false)
  const [extraSelectedPhotos, setExtraSelectedPhotos] = useState<
    Record<string, Photo>
  >({})
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
  const searchAbortRef = useRef<AbortController | null>(null)

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

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      if (searchAbortRef.current) searchAbortRef.current.abort()
    }
  }, [])

  const selecting = selectedIds.size > 0

  const offlineSet = useMemo(() => new Set(offlineIds), [offlineIds])

  const photoById = useMemo(() => {
    const m: Record<string, Photo> = { ...extraSelectedPhotos }
    for (const p of photos) m[p.id] = p
    return m
  }, [photos, extraSelectedPhotos])

  const selectedPhotos = useMemo(
    () => Array.from(selectedIds).map(id => photoById[id]).filter(Boolean),
    [selectedIds, photoById],
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setExtraSelectedPhotos({})
  }, [])

  const toggleDaySelection = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id))
      const next = new Set(prev)
      if (allSelected) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }, [])
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const previewPhotos = useMemo(
    () =>
      photos.map(p => ({
        uri: p.uri,
        fullUri: p.fullUri || p.uri,
        largeUri: p.largeUri,
        id: p.id,
        tags: p.tags,
        mimeType: p.mimeType,
      })),
    [photos],
  )

  const handlePressImage = useCallback(
    (data: { uri: string; id: string }) => {
      if (selecting) {
        toggleSelection(data.id)
      } else {
        const idx = previewPhotos.findIndex(p => p.id === data.id)
        navigation.navigate('PhotoPreview', {
          photos: previewPhotos,
          initialIndex: Math.max(idx, 0),
        })
      }
    },
    [selecting, previewPhotos, navigation, toggleSelection],
  )

  const handleLongPressImage = useCallback(
    (data: { uri: string; id: string }) => {
      if (!selecting) {
        impactLight()
        setSelectedIds(new Set([data.id]))
      }
    },
    [selecting],
  )

  const handleBatchDelete = useCallback(() => {
    warning()
    Alert.alert(`Eliminar ${selectedIds.size} foto(s)`, '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await bulkDeletePhotos(Array.from(selectedIds))
          setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)))
          clearSelection()
        },
      },
    ])
  }, [selectedIds, clearSelection])

  const handleBatchMakePrivate = useCallback(() => {
    warning()
    Alert.alert(`Marcar ${selectedIds.size} foto(s) como privada(s)`, 'Las fotos se moverán a la Caja Fuerte', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Privada',
        onPress: async () => {
          try {
            await bulkSetPrivate(Array.from(selectedIds))
            setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)))
            clearSelection()
          } catch {
            Alert.alert('Error', 'No se pudieron marcar como privadas')
          }
        },
      },
    ])
  }, [selectedIds, clearSelection])

  const handleBatchDownload = useCallback(async () => {
    const granted = await requestSaveToGalleryPermission()
    if (!granted) {
      promptOpenSettings()
      return
    }
    const token = await getToken()
    const timestamp = Date.now()
    const results = await Promise.allSettled(
      selectedPhotos.map(async (photo, i) => {
        const full = photo.fullUri || photo.uri
        const dest = `${RNFS.CachesDirectoryPath}/download_${timestamp}_${i}.jpg`
        const needAuth = !isPresignedUrl(full)
        const headers = needAuth && token ? { Authorization: `Bearer ${token}` } : undefined
        const result = await RNFS.downloadFile({ fromUrl: full, toFile: dest, headers }).promise
        if (result.statusCode !== 200) throw new Error(`HTTP ${result.statusCode}`)
        const info = await RNFS.stat(dest)
        if (info.size === 0) throw new Error('Archivo vacío')
        const fileUri = Platform.OS === 'android' ? `file://${dest}` : dest
        await CameraRoll.saveAsset(fileUri, { type: 'photo' })
      }),
    )
    const ok = results.filter(r => r.status === 'fulfilled').length
    const fail = results.length - ok
    Alert.alert(
      'Descargadas',
      fail > 0
        ? `${ok} de ${selectedIds.size} foto(s) guardada(s). ${fail} fallaron.`
        : `${ok} de ${selectedIds.size} foto(s) guardada(s) en la galería`,
    )
    clearSelection()
  }, [selectedPhotos, selectedIds, clearSelection])

  const handleBatchShare = useCallback(async () => {
    try {
      const fullUrls = selectedPhotos.map(p => p.fullUri || p.uri)
      await Share.open({ urls: fullUrls, type: 'image/jpeg' })
    } catch {}
    clearSelection()
  }, [selectedPhotos, clearSelection])

  const handleBatchAddToWidget = useCallback(async () => {
    const widgetPhotos = selectedPhotos.map(p => ({
      id: p.id,
      uri: p.uri,
      fullUri: p.fullUri || p.uri,
    }))
    const added = await addPhotosToWidget(widgetPhotos)
    if (added > 0) {
      success()
      Alert.alert('Widget', `${added} foto(s) agregada(s) al widget`)
    } else {
      Alert.alert('Widget', 'Las fotos ya estaban en el widget')
    }
    clearSelection()
  }, [selectedPhotos, clearSelection])

  const loadPhotos = useCallback(
    async (isRefresh = false, signal?: AbortSignal) => {
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
        const data = await fetchPhotosPage(
          {
            maxKeys: 50,
            favoritesOnly: favOnly,
            privateOnly: privOnly,
            dateFrom: dr.dateFrom,
            dateTo: dr.dateTo,
            query: searchRef.current || undefined,
          },
          signal,
        )
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

  const handleOpenSelectRange = useCallback(() => setShowSelectRangeModal(true), [])
  const handleCloseSelectRange = useCallback(() => setShowSelectRangeModal(false), [])

  const handleConfirmSelectRange = useCallback(
    async (start: string, end: string) => {
      setRangeSelectLoading(true)
      try {
        const dr = dateRange(start, end)
        const collected: Photo[] = []
        let pageToken: string | undefined
        let guard = 0
        do {
          const data = await fetchPhotosPage({
            maxKeys: 200,
            dateFrom: dr.dateFrom,
            dateTo: dr.dateTo,
            pageToken,
          })
          collected.push(...data.photos)
          pageToken = data.nextToken ?? undefined
          guard += 1
        } while (pageToken && guard < 25)

        setExtraSelectedPhotos(prev => {
          const next = { ...prev }
          collected.forEach(p => { next[p.id] = p })
          return next
        })
        setSelectedIds(prev => {
          const next = new Set(prev)
          collected.forEach(p => next.add(p.id))
          return next
        })
        setShowSelectRangeModal(false)
        if (collected.length === 0) {
          Alert.alert('Sin fotos', 'No hay fotos en ese rango de fechas')
        } else {
          success()
        }
      } catch {
        Alert.alert('Error', 'No se pudieron cargar las fotos de ese rango')
      } finally {
        setRangeSelectLoading(false)
      }
    },
    [],
  )

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
      if (photos.length === 0) {
        loadPhotos()
      } else {
        const y = scrollOffsetRef.current
        if (y > 0) {
          requestAnimationFrame(() => {
            flashListRef.current?.scrollToOffset({
              offset: y,
              animated: false,
            })
          })
        }
      }
      if (user?.id) getCachedIds(user.id).then(setOfflineIds)
      fetchRecuerdos()
      updateWidgetWithRecentPhotos()
    }, [clearSelection, user?.id, fetchRecuerdos, loadPhotos, photos.length]),
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

  const handleSelectYear = useCallback(
    (year: number) => {
      const from = `${year}-01-01`
      const to = `${year}-12-31`
      setDateFilter(from, to)
      setShowRangePicker(false)
    },
    [setDateFilter],
  )

  const handleClearDateRange = useCallback(() => {
    setDateFilter(null, null)
  }, [setDateFilter])

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      if (searchAbortRef.current) {
        searchAbortRef.current.abort()
        searchAbortRef.current = null
      }

      if (!q || q.length >= 2) {
        searchTimer.current = setTimeout(() => {
          searchRef.current = q
          setNextToken(null)
          setHasMore(true)
          const controller = new AbortController()
          searchAbortRef.current = controller
          loadPhotos(false, controller.signal).finally(() => {
            if (searchAbortRef.current === controller) {
              searchAbortRef.current = null
            }
          })
        }, 800)
      }
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
        const res = await addPhotosToAlbum(album.id, Array.from(selectedIds))
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
        { id: string; name: string; _count: { photos: number }; vault?: boolean }[]
      >('albums')
      const hasPrivate = selectedPhotos.some(p => p.private)
      if (hasPrivate) {
        try {
          const vaultData = await fetchVaultAlbums()
          setAlbums([...data, ...vaultData])
        } catch {
          setAlbums(data)
        }
      } else {
        setAlbums(data)
      }
      setShowAlbumPicker(true)
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los álbumes')
    }
  }, [selectedPhotos])

  const handlePressRecuerdo = useCallback(
    (r: { uri: string; fullUri: string; largeUri?: string | null; id: string; mimeType?: string }) => {
      navigation.navigate('PhotoPreview', {
        photos: [{ uri: r.uri, fullUri: r.fullUri || r.uri, largeUri: r.largeUri, id: r.id, mimeType: r.mimeType }],
        initialIndex: 0,
      })
    },
    [navigation],
  )

  const handleOpenDatePicker = useCallback(() => setShowRangePicker(true), [])
  const handleCloseRangePicker = useCallback(() => setShowRangePicker(false), [])
  const handleGoToProfile = useCallback(() => navigation.navigate('Profile'), [navigation])
  const handleGoToPeople = useCallback(() => navigation.navigate('People'), [navigation])

  const renderRecuerdos = useCallback(
    () => (
      <RecuerdosSection
        recuerdos={recuerdos}
        colors={colors}
        onPressRecuerdo={handlePressRecuerdo}
      />
    ),
    [recuerdos, colors, handlePressRecuerdo],
  )

  const handleToggleAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === photos.length ? new Set() : new Set(photos.map(p => p.id)),
    )
  }, [photos])

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
              {selectedIds.size} seleccionada(s)
            </Text>
            <TouchableOpacity onPress={handleToggleAll}>
              <Text style={[styles.selectionAction, { color: colors.primary }]}>
                {selectedIds.size === photos.length ? 'Ninguna' : 'Todo'}
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
          onOpenDatePicker={handleOpenDatePicker}
          onClearDateRange={handleClearDateRange}
          onToggleFavorites={toggleFilter}
          onGoToProfile={handleGoToProfile}
          onGoToPeople={handleGoToPeople}
          onOpenSelectRange={handleOpenSelectRange}
        />
      </>
    ),
    [
      clearSelection,
      colors,
      favoritesOnly,
      handleClearDateRange,
      handleSearch,
      handleOpenDatePicker,
      handleGoToProfile,
      handleGoToPeople,
      handleOpenSelectRange,
      handleToggleAll,
      photos.length,
      rangeEnd,
      rangeStart,
      searchQuery,
      selectedIds,
      selecting,
      toggleFilter,
    ],
  )

  const onScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y
  }, [])

  const overrideItemLayout = useCallback((layout: { span?: number }, item: ListItem) => {
    if (item.type === 'header') {
      layout.span = 2
    }
  }, [])

  const listHeaderComponent = useMemo(
    () => (
      <View>
        {renderHeaderContent()}
        <DateRangePicker
          visible={showRangePicker}
          rangeStart={rangeStart}
          colors={colors}
          onSelectYear={handleSelectYear}
          onClose={handleCloseRangePicker}
        />
        {renderRecuerdos()}
      </View>
    ),
    [renderHeaderContent, showRangePicker, rangeStart, colors, handleSelectYear, handleCloseRangePicker, renderRecuerdos],
  )

  const listFooterComponent = useMemo(
    () => (
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
    ),
    [loadingMore, hasMore, photos.length, colors.primary, colors.textTertiary],
  )

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
        const daySelected =
          item.photoIds.length > 0 &&
          item.photoIds.every(id => selectedIds.has(id))
        return (
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleDaySelection(item.photoIds)}
            onLongPress={() => {
              if (!selecting) {
                impactLight()
                setSelectedIds(new Set(item.photoIds))
              }
            }}
          >
            <Text style={[styles.dateLabel, { color: colors.text }]}>
              {new Date(item.date).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Icon
              name={daySelected ? 'check-circle' : 'radio-button-unchecked'}
              size={18}
              color={daySelected ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>
        )
      }
      if (item.type === 'photo') {
        const photo = item.photo
        const selected = selectedIds.has(photo.id)
        const isFav = !selected && photo.favorite
        const isOffline = !selected && !isFav && offlineSet.has(photo.id)
        const isBlurry = !selected && photo.blurred
        const isPrivate = !selected && photo.private
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
            toggleSelection={toggleSelection}
            handlePressImage={handlePressImage}
            handleLongPressImage={handleLongPressImage}
          />
        )
      }
      return null
    },
    [
      colors,
      selectedIds,
      offlineSet,
      selecting,
      toggleSelection,
      toggleDaySelection,
      handlePressImage,
      handleLongPressImage,
    ],
  )

  const keyExtractor = useCallback((item: ListItem) => item.key, [])

  const extraData = useMemo(
    () => [selectedIds, offlineSet, selecting, colors],
    [selectedIds, offlineSet, selecting, colors],
  )

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <SkeletonPhotoGrid _colors={colors} />
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
            colors={colors}
            onSelectYear={handleSelectYear}
            onClose={handleCloseRangePicker}
          />
          {renderRecuerdos()}
          <HomeEmptyState
            error={error}
            colors={colors}
            rangeStart={rangeStart}
            favoritesOnly={favoritesOnly}
            searchQuery={searchQuery}
            loadPhotos={() => loadPhotos()}
          />
        </ScrollView>
      ) : (
        <FlashList
          ref={flashListRef}
          style={styles.flashList}
          data={listData}
          keyExtractor={keyExtractor}
          numColumns={2}
          scrollEventThrottle={16}
          onScroll={onScroll}
          renderItem={renderItem}
          ListHeaderComponent={listHeaderComponent}
          ListFooterComponent={listFooterComponent}
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
          overrideItemLayout={overrideItemLayout}
        />
      )}
      <SelectionBar
        selectedCount={selectedIds.size}
        isDark={isDark}
        colors={colors}
        onDownload={handleBatchDownload}
        onShare={handleBatchShare}
        onAddToAlbum={handleOpenAlbumPicker}
        onAddToWidget={handleBatchAddToWidget}
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
      <SelectDateRangeModal
        visible={showSelectRangeModal}
        colors={colors}
        loading={rangeSelectLoading}
        onClose={handleCloseSelectRange}
        onConfirm={handleConfirmSelectRange}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
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

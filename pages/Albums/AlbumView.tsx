import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import { useNavigation, useRoute } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import LazyCalendar from '../../components/LazyCalendar'
import { useTheme } from '../../theme'
import {
  authenticatedGet,
  exportAlbum,
  removePhotosFromAlbum,
  updateAlbum,
} from '../../api/client'
import { useToast } from '../../context/ToastContext'
import type { StackNavProp, AlbumViewRouteProp } from '../../types/navigation'

type Photo = { id: string; uri: string; fullUri?: string; largeUri?: string | null; createdAt: string }

export default function AlbumView() {
  const route = useRoute<AlbumViewRouteProp>()
  const navigation = useNavigation<StackNavProp>()
  const { albumId, albumName } = route.params
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { showToast } = useToast()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selecting, setSelecting] = useState(false)

  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)
  const [filterActive, setFilterActive] = useState(false)

  const [showRename, setShowRename] = useState(false)
  const [renameText, setRenameText] = useState(albumName)

  const colCount = 3
  const gap = 2
  const thumbSize = (width - gap * (colCount - 1)) / colCount

  const fetchPhotos = useCallback(
    async (from?: string | null, to?: string | null) => {
      try {
        const data = await authenticatedGet<any[]>(`albums/${albumId}/photos`)
        let filtered = data.map(p => ({
          id: p.id,
          uri: p.uri,
          createdAt: p.createdAt,
        }))
        if (from && to) {
          const start = new Date(from + 'T00:00:00').getTime()
          const end = new Date(to + 'T23:59:59').getTime()
          filtered = filtered.filter(p => {
            const t = new Date(p.createdAt).getTime()
            return t >= start && t <= end
          })
        }
        filtered.sort((a, b) => {
          const da = new Date(a.createdAt).getTime()
          const db = new Date(b.createdAt).getTime()
          return db - da || b.id.localeCompare(a.id)
        })
        setPhotos(filtered)
      } catch {
        setPhotos([])
      }
    },
    [albumId],
  )

  const headerRight = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => setShowRename(true)}
        style={styles.headerRightBtn}
      >
        <Icon name="edit" size={22} color={colors.primary} />
      </TouchableOpacity>
    ),
    [colors],
  )

  useEffect(() => {
    navigation.setOptions({
      title: albumName,
      headerRight,
    })
    ;(async () => {
      setLoading(true)
      await fetchPhotos()
      setLoading(false)
    })()
  }, [albumId, albumName, navigation, colors, fetchPhotos, headerRight])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchPhotos(dateFrom, dateTo)
    setRefreshing(false)
  }

  const rows: Photo[][] = []
  for (let i = 0; i < photos.length; i += colCount) {
    rows.push(photos.slice(i, i + colCount))
  }

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) setSelecting(false)
      return next
    })
  }, [])

  function clearSelection() {
    setSelected(new Set())
    setSelecting(false)
  }

  const renderItem = useCallback(
    ({ item: row }: { item: Photo[] }) => (
      <View style={styles.row}>
        {row.map(photo => {
          const isSelected = selected.has(photo.id)
          return (
            <TouchableOpacity
              key={photo.id}
              onPress={() => {
                if (selecting) {
                  toggleSelect(photo.id)
                  return
                }
                navigation.navigate('PhotoPreview', {
                  photos: photos.map(p => ({ uri: p.uri, fullUri: p.fullUri || p.uri, largeUri: p.largeUri, id: p.id })),
                  initialIndex: photos.indexOf(photo),
                })
              }}
              onLongPress={() => {
                setSelecting(true)
                toggleSelect(photo.id)
              }}
            >
              <View>
                <NitroImage
                  image={{ url: photo.uri }}
                  style={{
                    width: thumbSize,
                    height: thumbSize,
                    opacity: isSelected ? 0.6 : 1,
                  }}
                  resizeMode="cover"
                />
                {isSelected && (
                  <View
                    style={[
                      styles.checkOverlay,
                      { backgroundColor: colors.primary + 'cc' },
                    ]}
                  >
                    <Icon name="check" size={22} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    ),
    [selected, selecting, photos, navigation, colors, thumbSize, toggleSelect],
  )

  async function handleRemove() {
    if (selected.size === 0) return
    Alert.alert('Quitar fotos', `¿Quitar ${selected.size} foto(s) del álbum?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          try {
            await removePhotosFromAlbum(albumId, Array.from(selected))
            clearSelection()
            await fetchPhotos(dateFrom, dateTo)
          } catch {
            Alert.alert('Error', 'No se pudieron quitar las fotos')
          }
        },
      },
    ])
  }

  async function handleSetCover() {
    if (selected.size === 0) return
    const id = Array.from(selected)[0]
    try {
      await updateAlbum(albumId, { coverPhotoId: id })
      clearSelection()
      Alert.alert('Listo', 'Portada actualizada')
    } catch {
      Alert.alert('Error', 'No se pudo establecer la portada')
    }
  }

  async function handleRename() {
    if (!renameText.trim()) return
    try {
      await updateAlbum(albumId, { name: renameText.trim() })
      setShowRename(false)
      navigation.setOptions({ title: renameText.trim() })
    } catch {
      Alert.alert('Error', 'No se pudo renombrar')
    }
  }

  function applyDateFilter() {
    if (dateFrom && dateTo) {
      setFilterActive(true)
      setShowDateFilter(false)
      fetchPhotos(dateFrom, dateTo)
    }
  }

  function clearDateFilter() {
    setDateFrom(null)
    setDateTo(null)
    setFilterActive(false)
    fetchPhotos()
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loadingCentered}
        />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surfaceAlt,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.topCount, { color: colors.textSecondary }]}>
          {photos.length} foto(s)
          {filterActive ? ' (filtradas)' : ''}
        </Text>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => setShowDateFilter(true)}
          >
            <Icon name="date-range" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, { backgroundColor: colors.primary }]}
            onPress={async () => {
              try {
                await exportAlbum(albumId)
                showToast({ message: 'Exportación iniciada', type: 'info' })
              } catch {
                showToast({ message: 'No se pudo exportar', type: 'error' })
              }
            }}
          >
            <Icon name="file-download" size={16} color="#fff" />
            <Text style={styles.topBtnText}>Exportar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filterActive && (
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: colors.primary + '18' },
          ]}
          onPress={clearDateFilter}
        >
          <Icon name="close" size={16} color={colors.primary} />
          <Text style={[styles.filterChipText, { color: colors.primary }]}>
            {dateFrom} – {dateTo}
          </Text>
        </TouchableOpacity>
      )}

      {selecting && (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: colors.primary,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={styles.actionCount}>
            {selected.size} seleccionada(s)
          </Text>
          <View style={styles.actionActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleSetCover}>
              <Icon name="photo" size={18} color="#fff" />
              <Text style={styles.actionBtnLabel}>Portada</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleRemove}>
              <Icon name="remove-circle-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnLabel}>Quitar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={clearSelection}>
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {photos.length === 0 && !selecting ? (
        <View style={styles.emptyState}>
          <Icon name="photo-library" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            {filterActive
              ? 'Sin resultados para este filtro'
              : 'Este álbum está vacío'}
          </Text>
          {filterActive && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={clearDateFilter}
            >
              <Text style={styles.addBtnText}>Limpiar filtro</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {/* ── Date filter modal ── */}
      <Modal visible={showDateFilter} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Filtrar por fecha
              </Text>
              <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <LazyCalendar
              onDayPress={(day: { dateString: string }) => {
                if (!dateFrom || (dateFrom && dateTo)) {
                  setDateFrom(day.dateString)
                  setDateTo(null)
                } else {
                  if (day.dateString < dateFrom) {
                    setDateTo(dateFrom)
                    setDateFrom(day.dateString)
                  } else {
                    setDateTo(day.dateString)
                  }
                }
              }}
              markedDates={{
                ...(dateFrom
                  ? {
                      [dateFrom]: {
                        selected: true,
                        startingDay: true,
                        color: colors.primary,
                      },
                    }
                  : {}),
                ...(dateTo
                  ? {
                      [dateTo]: {
                        selected: true,
                        endingDay: true,
                        color: colors.primary,
                      },
                    }
                  : {}),
                ...(dateFrom && dateTo
                  ? Object.fromEntries(
                      (() => {
                        const d: [string, any][] = []
                        const s = new Date(dateFrom)
                        const e = new Date(dateTo)
                        for (
                          let d2 = new Date(s);
                          d2 <= e;
                          d2.setDate(d2.getDate() + 1)
                        ) {
                          const ds = d2.toISOString().slice(0, 10)
                          if (ds !== dateFrom && ds !== dateTo)
                            d.push([
                              ds,
                              { selected: true, color: colors.primary + '44' },
                            ])
                        }
                        return d
                      })(),
                    )
                  : {}),
              }}
              markingType="period"
              theme={{
                todayTextColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                arrowColor: colors.primary,
                calendarBackground: colors.background,
                dayTextColor: colors.text,
                monthTextColor: colors.text,
                textDisabledColor: colors.textTertiary,
              }}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnOutline,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setDateFrom(null)
                  setDateTo(null)
                  setShowDateFilter(false)
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                disabled={!dateFrom || !dateTo}
                onPress={applyDateFilter}
              >
                <Text style={[styles.modalBtnText, styles.modalBtnTextLight]}>
                  Aplicar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Rename modal ── */}
      <Modal visible={showRename} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.renameCard, { backgroundColor: colors.background }]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text },
                styles.modalTitleSpaced,
              ]}
            >
              Renombrar álbum
            </Text>
            <TextInput
              style={[
                styles.renameInput,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.inputBg,
                },
              ]}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnOutline,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowRename(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleRename}
              >
                <Text style={[styles.modalBtnText, styles.modalBtnTextLight]}>
                  Guardar
                </Text>
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
  list: { padding: 0 },
  row: { flexDirection: 'row', marginBottom: 2 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 16 },
  addBtn: {
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  topCount: { fontSize: 13 },
  topBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  actionCount: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnLabel: { color: '#fff', fontSize: 12 },
  checkOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  renameCard: {
    marginHorizontal: 32,
    borderRadius: 16,
    padding: 24,
    elevation: 8,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  headerRightBtn: { marginRight: 16 },
  loadingCentered: { flex: 1 },
  topActions: { flexDirection: 'row', gap: 8 },
  actionActions: { flexDirection: 'row', gap: 4 },
  modalBtnOutline: { borderWidth: 1 },
  modalBtnTextLight: { color: '#fff' },
  modalTitleSpaced: { marginBottom: 12 },
})

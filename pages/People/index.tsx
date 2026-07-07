import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../../theme'
import {
  addTag,
  getPeople,
  getUnconfirmedFaces,
  updateFace,
  deleteFace,
  findMoreFaces,
  detectAllFaces,
  getFaceDetectStatus,
  getFaceDetectProgress,
  stopFaceDetectAll,
} from '../../api/client'
import type { StackNavProp } from '../../types/navigation'
import type { Person, UnconfirmedFace } from '../../api/client'

export default function PeopleScreen() {
  const navigation = useNavigation<StackNavProp>()
  const { colors } = useTheme()
  const [people, setPeople] = useState<Person[]>([])
  const [unconfirmed, setUnconfirmed] = useState<UnconfirmedFace[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nameModalVisible, setNameModalVisible] = useState(false)
  const [namingFaceId, setNamingFaceId] = useState<string | null>(null)
  const [namingText, setNamingText] = useState('')
  const [namingSuggestions, setNamingSuggestions] = useState<{ personName: string; distance: number }[]>([])
  const [scanStatus, setScanStatus] = useState<{ total: number; pending: number; detected: number } | null>(null)
  const [scanJob, setScanJob] = useState<{ jobId: string; total: number } | null>(null)
  const [scanProgress, setScanProgress] = useState<{ processed: number; facesFound: number; status: string } | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [peopleData, unconfirmedData, statusData] = await Promise.all([
        getPeople(),
        getUnconfirmedFaces(),
        getFaceDetectStatus(),
      ])
      setPeople(peopleData)
      setUnconfirmed(unconfirmedData)
      setScanStatus(statusData)
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las personas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchData()

      const interval = setInterval(async () => {
        if (isScanning && scanJob) {
          try {
            const p = await getFaceDetectProgress(scanJob.jobId)
            setScanProgress(p)
            if (p.status === 'completed') {
              setIsScanning(false)
              setScanJob(null)
              fetchData()
            } else if (p.status === 'stopped') {
              setIsScanning(false)
              setScanJob(null)
            }
          } catch {}
        }
      }, 3000)

      return () => clearInterval(interval)
    }, [fetchData, isScanning, scanJob]),
  )

  const handleConfirmSuggestion = useCallback(async (faceId: string, personName: string) => {
    try {
      const result = await updateFace(faceId, { personName, confirmed: true })
      setUnconfirmed((prev) => prev.filter((f) => f.id !== faceId))
      if (result?.suggestedTag) {
        setTimeout(() => {
          Alert.alert(
            'Agregar etiqueta',
            `¿Agregar "${result.suggestedTag}" como etiqueta en esta foto?`,
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Sí',
                onPress: async () => {
                  try {
                    await addTag(result.photoId, result.suggestedTag)
                  } catch { /* tag already exists or error */ }
                },
              },
            ],
          )
        }, 300)
      }
    } catch {
      Alert.alert('Error', 'No se pudo confirmar la sugerencia')
    }
  }, [])

  const openNameModal = useCallback((faceId: string, prefillName?: string, suggestions?: { personName: string; distance: number }[]) => {
    setNamingFaceId(faceId)
    setNamingText(prefillName || '')
    setNamingSuggestions(suggestions || [])
    setNameModalVisible(true)
  }, [])

  const handleSaveName = useCallback(async () => {
    if (!namingFaceId || !namingText.trim()) return
    const face = unconfirmed.find((f) => f.id === namingFaceId)
    try {
      const result = await updateFace(namingFaceId, {
        personName: namingText.trim(),
        confirmed: true,
      })
      setUnconfirmed((prev) => prev.filter((f) => f.id !== namingFaceId))
      setNameModalVisible(false)
      setNamingFaceId(null)
      fetchData()
      if (result?.suggestedTag) {
        setTimeout(() => {
          Alert.alert(
            'Agregar etiqueta',
            `¿Agregar "${result.suggestedTag}" como etiqueta en esta foto?`,
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Sí',
                onPress: async () => {
                  try {
                    await addTag(result.photoId, result.suggestedTag)
                  } catch { /* tag already exists or error */ }
                },
              },
            ],
          )
        }, 300)
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar el nombre')
    }
  }, [namingFaceId, namingText, unconfirmed, fetchData])

  const handleIgnore = useCallback(async (faceId: string) => {
    try {
      await updateFace(faceId, { ignored: true })
      setUnconfirmed((prev) => prev.filter((f) => f.id !== faceId))
    } catch {
      Alert.alert('Error', 'No se pudo descartar la cara')
    }
  }, [])

  const handleDeleteFace = useCallback(async (faceId: string) => {
    try {
      await deleteFace(faceId)
      setUnconfirmed((prev) => prev.filter((f) => f.id !== faceId))
    } catch {
      Alert.alert('Error', 'No se pudo eliminar')
    }
  }, [])

  const [searchResults, setSearchResults] = useState<{ results: { faceId: string; photoId: string; photoUri: string; distance: number }[]; personName: string } | null>(null)
  const [searching, setSearching] = useState<string | null>(null)

  const handleFindMore = useCallback(async (personName: string) => {
    setSearching(personName)
    try {
      const results = await findMoreFaces(personName)
      setSearchResults({ results, personName })
    } catch {
      Alert.alert('Error', `No se pudieron buscar más fotos de ${personName}`)
    } finally {
      setSearching(null)
    }
  }, [])

  const handleStartScan = useCallback(async () => {
    try {
      const result = await detectAllFaces()
      if (result.status === 'nothing_to_scan') {
        Alert.alert('Listo', 'No hay fotos pendientes de escanear')
        return
      }
      setScanJob({ jobId: result.jobId, total: result.total })
      setScanProgress({ processed: 0, facesFound: 0, status: 'running' })
      setIsScanning(true)
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el escaneo')
    }
  }, [])

  const handleStopScan = useCallback(async () => {
    if (!scanJob) return
    try {
      await stopFaceDetectAll(scanJob.jobId)
      setIsScanning(false)
      setScanJob(null)
    } catch { /* ignore */ }
  }, [scanJob])

  const handleConfirmMatches = useCallback(async (personName: string) => {
    if (!searchResults || searchResults.results.length === 0) return
    const count = searchResults.results.length
    try {
      await Promise.all(
        searchResults.results.map((r) =>
          updateFace(r.faceId, { personName, confirmed: true }),
        ),
      )
      Alert.alert('Hecho', `${count} ${count === 1 ? 'foto agregada' : 'fotos agregadas'} a ${personName}`)
      setSearchResults(null)
      fetchData()
    } catch {
      Alert.alert('Error', 'No se pudieron confirmar las coincidencias')
    }
  }, [searchResults, fetchData])

  if (loading) {
    return (
      <View
        style={[styles.container, styles.center, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={people}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {scanStatus && scanStatus.pending > 0 && !isScanning && (
              <TouchableOpacity
                style={[styles.scanBtn, { backgroundColor: colors.primary }]}
                onPress={handleStartScan}
              >
                <Icon name="face" size={18} color="#fff" />
                <Text style={styles.scanBtnText}>
                  Escanear biblioteca ({scanStatus.pending.toLocaleString()} pendientes)
                </Text>
              </TouchableOpacity>
            )}
            {isScanning && scanProgress && (
              <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${Math.min((scanProgress.processed / (scanJob?.total || 1)) * 100, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {scanProgress.processed.toLocaleString()} / {scanJob?.total.toLocaleString()} fotos
                  </Text>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {scanProgress.facesFound} caras detectadas
                  </Text>
                </View>
                <TouchableOpacity style={styles.stopBtn} onPress={handleStopScan}>
                  <Text style={[styles.stopBtnText, { color: colors.danger }]}>
                    Detener
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {unconfirmed.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Por confirmar ({unconfirmed.length})
                </Text>
                <FlatList
                  data={unconfirmed}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.unconfirmedRow}
                  renderItem={({ item }) => {
                    const top = item.suggestions?.[0]
                    return (
                      <View
                        style={[
                          styles.unconfirmedCard,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.unconfirmedThumb,
                            { backgroundColor: colors.skeleton },
                          ]}
                        >
                          {item.photoUri ? (
                            <NitroImage
                              image={{ url: item.photoUri }}
                              style={styles.unconfirmedThumb}
                              resizeMode="cover"
                              recyclingKey={item.id}
                            />
                          ) : (
                            <Icon name="face" size={32} color={colors.textTertiary} />
                          )}
                        </View>
                        <View style={styles.unconfirmedActions}>
                          {top && top.distance < 0.30 ? (
                            <TouchableOpacity
                              style={[styles.suggestionChip, { backgroundColor: colors.primary }]}
                              onPress={() => handleConfirmSuggestion(item.id, top.personName)}
                            >
                              <Text
                                style={[styles.suggestionChipText, { color: '#fff' }]}
                                numberOfLines={1}
                              >
                                {top.personName}
                              </Text>
                            </TouchableOpacity>
                          ) : top && top.distance < 0.50 ? (
                            <TouchableOpacity
                              style={[styles.suggestionChip, { backgroundColor: colors.border }]}
                              onPress={() => openNameModal(item.id, top.personName, item.suggestions)}
                            >
                              <Text
                                style={[styles.suggestionChipText, { color: colors.text }]}
                                numberOfLines={1}
                              >
                                {top.personName}?
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.suggestionChip, { backgroundColor: colors.border }]}
                              onPress={() => openNameModal(item.id, undefined, item.suggestions)}
                            >
                              <Icon name="edit" size={14} color={colors.textSecondary} />
                              <Text
                                style={[styles.suggestionChipText, { color: colors.textSecondary, marginLeft: 4 }]}
                              >
                                Nombrar
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.border }]}
                            onPress={() => handleIgnore(item.id)}
                          >
                            <Icon name="close" size={14} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  }}
                />
              </View>
            )}
            {people.length > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Personas ({people.length})
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="face" size={56} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay personas detectadas aún
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              Sube fotos con caras para empezar a identificar personas
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() =>
              navigation.navigate('PersonView', { personName: item.name })
            }
          >
            <View style={[styles.thumb, { backgroundColor: colors.skeleton }]}>
              {item.thumbnailUri ? (
                <NitroImage
                  image={{ url: item.thumbnailUri }}
                  style={styles.thumb}
                  resizeMode="cover"
                  recyclingKey={item.name}
                />
              ) : (
                <Icon name="face" size={28} color={colors.primary} />
              )}
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.cardCount, { color: colors.textTertiary }]}>
                {item.photoCount} {item.photoCount === 1 ? 'foto' : 'fotos'} ·{' '}
                {item.faceCount} {item.faceCount === 1 ? 'rostro' : 'rostros'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.filterPersonBtn, { backgroundColor: colors.primary + '20' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => handleFindMore(item.name)}
              disabled={searching === item.name}
            >
              {searching === item.name ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon name="search" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
            <Icon name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchData()
            }}
            tintColor={colors.primary}
          />
        }
      />

      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ¿Quién es esta persona?
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
              placeholder="Nombre de la persona"
              placeholderTextColor={colors.textTertiary}
              value={namingText}
              onChangeText={setNamingText}
              autoFocus
              maxLength={50}
              onSubmitEditing={handleSaveName}
            />
            {namingSuggestions.length > 0 && (
              <View style={styles.existingPeopleRow}>
                <Text style={[styles.existingPeopleLabel, { color: colors.textSecondary }]}>
                  Sugerencias:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScroll}
                  keyboardShouldPersistTaps="always"
                >
                  {namingSuggestions.map((s) => (
                    <TouchableOpacity
                      key={s.personName}
                      style={[
                        styles.personChip,
                        namingText === s.personName
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.border },
                      ]}
                      onPress={() => setNamingText(s.personName)}
                    >
                      <Text
                        style={[
                          styles.personChipText,
                          namingText === s.personName
                            ? { color: '#fff' }
                            : { color: colors.text },
                        ]}
                      >
                        {s.personName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {people.length > 0 && (
              <View style={styles.existingPeopleRow}>
                <Text style={[styles.existingPeopleLabel, { color: colors.textSecondary }]}>
                  Personas existentes:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScroll}
                  keyboardShouldPersistTaps="always"
                >
                  {people.map(p => (
                    <TouchableOpacity
                      key={p.name}
                      style={[
                        styles.personChip,
                        namingText === p.name
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.border },
                      ]}
                      onPress={() => setNamingText(p.name)}
                    >
                      <Text
                        style={[
                          styles.personChipText,
                          namingText === p.name
                            ? { color: '#fff' }
                            : { color: colors.text },
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setNameModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveName}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={searchResults !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSearchResults(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.resultsCard, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {searchResults
                ? `${searchResults.results.length} posible(s) coincidencia(s) con ${searchResults.personName}`
                : ''}
            </Text>
            {searchResults && searchResults.results.length > 0 ? (
              <>
                <FlatList
                  data={searchResults.results}
                  keyExtractor={(item) => item.faceId}
                  numColumns={3}
                  contentContainerStyle={styles.resultsGrid}
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.resultThumb,
                        { backgroundColor: colors.skeleton },
                      ]}
                    >
                      <NitroImage
                        image={{ url: item.photoUri }}
                        style={styles.resultThumb}
                        resizeMode="cover"
                        recyclingKey={item.faceId}
                      />
                    </View>
                  )}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.border }]}
                    onPress={() => setSearchResults(null)}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.text }]}>
                      Cerrar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleConfirmMatches(searchResults.personName)}
                  >
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                      Confirmar todas
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.empty}>
                <Icon name="search-off" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No se encontraron coincidencias
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 4,
  },
  unconfirmedRow: { paddingRight: 16 },
  unconfirmedCard: {
    width: 120,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    padding: 6,
    marginRight: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 78,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unconfirmedThumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unconfirmedActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, marginLeft: 12 },
  filterPersonBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardCount: { fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyHint: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
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
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  existingPeopleRow: { marginBottom: 16 },
  existingPeopleLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chipScroll: { flexDirection: 'row' },
  personChip: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  personChipText: { fontSize: 13, fontWeight: '500' },
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
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  scanBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  progressCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 13 },
  stopBtn: { alignSelf: 'flex-end', marginTop: 4 },
  stopBtnText: { fontSize: 13, fontWeight: '600' },
  resultsCard: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 14,
    padding: 16,
    maxWidth: 400,
  },
  resultsGrid: { paddingBottom: 12 },
  resultThumb: {
    width: 80,
    height: 80,
    borderRadius: 6,
    margin: 3,
  },
})

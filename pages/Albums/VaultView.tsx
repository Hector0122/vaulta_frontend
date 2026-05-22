import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
  Image,
} from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import { useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../../theme'
import { fetchVault, removePhotosFromAlbum, createAlbum } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  isBiometricsAvailable,
  promptBiometrics,
} from '../../services/biometrics'
import type { StackNavProp } from '../../types/navigation'

const PIN_KEY = '@vaulta_vault_pin'

type VaultPhoto = {
  uri: string
  id: string
  createdAt: string
  private: boolean
}

type VaultAlbum = {
  id: string
  name: string
  _count: { photos: number }
  createdAt: string
  coverUri: string | null
}

type MainVault = {
  id: string
  name: string
  photos: VaultPhoto[]
  _count: { photos: number }
}

export default function VaultView() {
  const navigation = useNavigation<StackNavProp>()
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const [step, setStep] = useState<'pin' | 'set-pin' | 'gallery'>('pin')
  const [galleryView, setGalleryView] = useState<'albums' | 'all'>('albums')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [_biometricType, setBiometricType] = useState('')
  const [mainVault, setMainVault] = useState<MainVault | null>(null)
  const [vaultAlbums, setVaultAlbums] = useState<VaultAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selecting, setSelecting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [creating, setCreating] = useState(false)
  const { showToast } = useToast()

  const colCount = 3
  const gap = 2
  const thumbSize = (width - gap * (colCount - 1)) / colCount

  useEffect(() => {
    ;(async () => {
      const { available, biometryLabel } = await isBiometricsAvailable()
      setBiometricAvailable(available)
      setBiometricType(biometryLabel)

      const stored = await AsyncStorage.getItem(PIN_KEY)
      if (stored) {
        setStep('pin')
      } else {
        setStep('set-pin')
      }
      setLoading(false)
    })()
  }, [])

  const loadVault = useCallback(async () => {
    try {
      const data = await fetchVault()
      setMainVault(data.mainVault)
      setVaultAlbums(data.vaultAlbums)
    } catch {
      Alert.alert('Error', 'No se pudo cargar la caja fuerte')
    }
  }, [])

  useEffect(() => {
    if (step === 'gallery') loadVault()
  }, [step, loadVault])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadVault()
    setRefreshing(false)
  }

  function handlePinDigit(d: string) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setPinError('')
    if (next.length === 4 && step === 'pin') verifyPin(next)
  }

  function handleDeleteDigit() {
    setPin(p => p.slice(0, -1))
    setPinError('')
  }

  async function verifyPin(entered: string) {
    const stored = await AsyncStorage.getItem(PIN_KEY)
    if (entered === stored) {
      setPin('')
      setGalleryView('albums')
      setStep('gallery')
    } else {
      setPinError('PIN incorrecto')
      setPin('')
    }
  }

  async function handleSetPin() {
    if (pin.length !== 4) return
    await AsyncStorage.setItem(PIN_KEY, pin)
    setPin('')
    setGalleryView('albums')
    setStep('gallery')
  }

  const photos = useMemo(() => mainVault?.photos || [], [mainVault])
  const rows: VaultPhoto[][] = []
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

  async function handleRemove() {
    if (selected.size === 0 || !mainVault) return
    Alert.alert(
      'Quitar fotos',
      `¿Quitar ${selected.size} foto(s) de la caja fuerte?\nSe eliminará su marca de privada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePhotosFromAlbum(mainVault.id, Array.from(selected))
              clearSelection()
              await loadVault()
            } catch {
              Alert.alert('Error', 'No se pudieron quitar las fotos')
            }
          },
        },
      ],
    )
  }

  async function handleCreateVaultAlbum() {
    if (!newAlbumName.trim() || creating) return
    setCreating(true)
    try {
      await createAlbum(newAlbumName.trim(), true)
      setNewAlbumName('')
      setShowCreate(false)
      await loadVault()
      showToast({ message: 'Álbum creado en la caja fuerte', type: 'success' })
    } catch {
      Alert.alert('Error', 'No se pudo crear el álbum')
    } finally {
      setCreating(false)
    }
  }

  const renderItem = useCallback(
    ({ item: row }: { item: VaultPhoto[] }) => (
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
                  photos: photos.map(p => ({ uri: p.uri, id: p.id })),
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
                <View style={styles.vaultBadge}>
                  <Icon name="visibility-off" size={14} color="#ffa726" />
                </View>
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

  if (step === 'pin' || step === 'set-pin') {
    return (
      <View
        style={[
          styles.container,
          styles.pinContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Icon name="lock" size={48} color={colors.primary} />
        <Text style={[styles.pinTitle, { color: colors.text }]}>
          {step === 'set-pin'
            ? 'Crear PIN de la Caja Fuerte'
            : 'Ingresa tu PIN'}
        </Text>
        {step === 'set-pin' && (
          <Text style={[styles.pinSubtitle, { color: colors.textSecondary }]}>
            Este PIN protegerá tu caja fuerte de fotos privadas
          </Text>
        )}
        <View style={styles.pinDots}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                styles.pinDot,
                {
                  backgroundColor:
                    pin.length > i ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>
        {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
        {biometricAvailable && step === 'pin' && (
          <TouchableOpacity
            style={[
              styles.biometricKey,
              { backgroundColor: colors.surfaceAlt },
            ]}
            onPress={async () => {
              const ok = await promptBiometrics('Desbloquea la Caja Fuerte')
              if (ok) {
                setPin('')
                setStep('gallery')
              }
            }}
          >
            <Icon name="fingerprint" size={36} color={colors.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.pinPad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(
            (d, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.pinKey, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => {
                  if (d === '⌫') handleDeleteDigit()
                  else if (d) handlePinDigit(d)
                }}
                disabled={!d && d !== ''}
              >
                <Text style={[styles.pinKeyText, { color: colors.text }]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>
        {step === 'set-pin' && (
          <TouchableOpacity
            style={[
              styles.pinConfirmBtn,
              {
                backgroundColor:
                  pin.length === 4 ? colors.primary : colors.border,
              },
            ]}
            disabled={pin.length !== 4}
            onPress={handleSetPin}
          >
            <Text style={styles.pinConfirmText}>Confirmar PIN</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const renderVaultAlbumItem = useCallback(
    ({ item }: { item: VaultAlbum }) => (
      <TouchableOpacity
        style={[styles.albumCard, { backgroundColor: colors.cardBg }]}
        onPress={() =>
          navigation.navigate('AlbumView', {
            albumId: item.id,
            albumName: item.name,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.albumCardContent}>
          {item.coverUri ? (
            <Image source={{ uri: item.coverUri }} style={styles.albumCoverThumb} />
          ) : (
            <View style={[styles.albumCoverPlaceholder, { backgroundColor: colors.primary + '20' }]}>
              <Icon name="photo-album" size={22} color={colors.primary} />
            </View>
          )}
          <View style={styles.albumCardText}>
            <Text style={[styles.albumCardTitle, { color: colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.albumCardSubtitle, { color: colors.textTertiary }]}>
              {item._count?.photos ?? 0} fotos
            </Text>
          </View>
        </View>
        <Icon name="chevron-right" size={22} color={colors.textTertiary} />
      </TouchableOpacity>
    ),
    [colors, navigation],
  )

  if (step === 'gallery' && galleryView === 'albums') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={vaultAlbums}
          keyExtractor={item => item.id}
          renderItem={renderVaultAlbumItem}
          contentContainerStyle={styles.albumList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              <TouchableOpacity
                style={[styles.allPrivatesCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => setGalleryView('all')}
                activeOpacity={0.7}
              >
                <Icon name="visibility-off" size={22} color="#ffa726" />
                <Text style={[styles.allPrivatesText, { color: colors.text }]}>
                  Todas las privadas
                </Text>
                <Text style={[styles.allPrivatesCount, { color: colors.textTertiary }]}>
                  {mainVault?._count.photos ?? 0} fotos
                </Text>
                <Icon name="chevron-right" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
              {vaultAlbums.length > 0 && (
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Álbumes de la caja fuerte
                </Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="lock" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {mainVault?._count.photos ? 'Crea un álbum para organizar tus fotos privadas' : 'La caja fuerte está vacía'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Marca fotos como privadas desde la vista previa o la selección múltiple
              </Text>
            </View>
          }
        />
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
        >
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>

        <Modal visible={showCreate} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.createCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Nuevo álbum privado
              </Text>
              <TextInput
                style={[styles.createInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="Nombre del álbum"
                placeholderTextColor={colors.textTertiary}
                value={newAlbumName}
                onChangeText={setNewAlbumName}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnOutline, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => { setShowCreate(false); setNewAlbumName('') }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateVaultAlbum}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.modalBtnText, styles.modalBtnTextLight]}>Crear</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
        <TouchableOpacity onPress={() => { setGalleryView('albums'); clearSelection() }}>
          <Icon name="arrow-back" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.topCount, { color: colors.textSecondary }]}>
          {mainVault?._count.photos ?? 0} foto(s)
        </Text>
        <View style={{ width: 22 }} />
      </View>

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

      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="lock" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            La caja fuerte está vacía
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Marca fotos como privadas desde la vista previa o agrégalas desde la
            selección múltiple
          </Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 0 },
  row: { flexDirection: 'row', marginBottom: 2 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: { fontSize: 16, marginTop: 16 },
  emptySubtext: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  topCount: { fontSize: 13 },
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
  pinContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  pinSubtitle: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  pinDots: { flexDirection: 'row', gap: 16, marginTop: 28, marginBottom: 8 },
  pinDot: { width: 18, height: 18, borderRadius: 9 },
  pinError: { color: '#ff5252', fontSize: 14, marginTop: 4 },
  pinPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
    maxWidth: 280,
  },
  pinKey: {
    width: 72,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinKeyText: { fontSize: 24, fontWeight: '500' },
  pinConfirmBtn: {
    marginTop: 24,
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  pinConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  biometricKey: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  biometricLabel: { fontSize: 12, marginTop: 4 },
  vaultBadge: { position: 'absolute', bottom: 4, right: 4 },
  loadingCentered: { flex: 1 },
  actionActions: { flexDirection: 'row', gap: 4 },
  albumList: { padding: 16 },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  albumCardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  albumCoverThumb: { width: 44, height: 44, borderRadius: 8 },
  albumCoverPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumCardText: { marginLeft: 12, flex: 1 },
  albumCardTitle: { fontSize: 16, fontWeight: '600' },
  albumCardSubtitle: { fontSize: 13, marginTop: 2 },
  allPrivatesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  allPrivatesText: { fontSize: 16, fontWeight: '600', flex: 1 },
  allPrivatesCount: { fontSize: 13 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 12, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  createCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    elevation: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  createInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnOutline: { borderWidth: 1 },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  modalBtnTextLight: { color: '#fff' },
})

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, useWindowDimensions, Alert,
  RefreshControl, Modal, TextInput,
} from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import { useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../../theme'
import { fetchVault, removePhotosFromAlbum } from '../../api/client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { StackNavProp } from '../../types/navigation'

const PIN_KEY = '@vaulta_vault_pin'

type VaultPhoto = { uri: string; id: string; createdAt: string; private: boolean }

export default function VaultView() {
  const navigation = useNavigation<StackNavProp>()
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const [step, setStep] = useState<'pin' | 'set-pin' | 'gallery'>('pin')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [vaultData, setVaultData] = useState<{ id: string; photos: VaultPhoto[]; _count: { photos: number } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selecting, setSelecting] = useState(false)

  const colCount = 3
  const gap = 2
  const thumbSize = (width - gap * (colCount - 1)) / colCount

  useEffect(() => {
    ;(async () => {
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
      setVaultData(data)
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
    setStep('gallery')
  }

  const rows: VaultPhoto[][] = []
  const photos = vaultData?.photos || []
  for (let i = 0; i < photos.length; i += colCount) {
    rows.push(photos.slice(i, i + colCount))
  }

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      if (next.size === 0) setSelecting(false)
      return next
    })
  }, [])

  function clearSelection() {
    setSelected(new Set())
    setSelecting(false)
  }

  async function handleRemove() {
    if (selected.size === 0 || !vaultData) return
    Alert.alert(
      'Quitar fotos',
      `¿Quitar ${selected.size} foto(s) de la caja fuerte?\nSe eliminará su marca de privada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar', style: 'destructive',
          onPress: async () => {
            try {
              await removePhotosFromAlbum(vaultData.id, Array.from(selected))
              clearSelection()
              await loadVault()
            } catch { Alert.alert('Error', 'No se pudieron quitar las fotos') }
          },
        },
      ],
    )
  }

  const renderItem = useCallback(({ item: row }: { item: VaultPhoto[] }) => (
    <View style={styles.row}>
      {row.map(photo => {
        const isSelected = selected.has(photo.id)
        return (
          <TouchableOpacity
            key={photo.id}
            onPress={() => {
              if (selecting) { toggleSelect(photo.id); return }
              navigation.navigate('PhotoPreview', {
                photos: photos.map(p => ({ uri: p.uri, id: p.id })),
                initialIndex: photos.indexOf(photo),
              })
            }}
            onLongPress={() => { setSelecting(true); toggleSelect(photo.id) }}
          >
            <View>
              <NitroImage
                image={{ url: photo.uri }}
                style={{ width: thumbSize, height: thumbSize, opacity: isSelected ? 0.6 : 1 }}
                resizeMode="cover"
              />
              <View style={{ position: 'absolute', bottom: 4, right: 4 }}>
                <Icon name="visibility-off" size={14} color="#ffa726" />
              </View>
              {isSelected && (
                <View style={[styles.checkOverlay, { backgroundColor: colors.primary + 'cc' }]}>
                  <Icon name="check" size={22} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  ), [selected, selecting, photos, navigation, colors, thumbSize, toggleSelect])

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </View>
    )
  }

  if (step === 'pin' || step === 'set-pin') {
    return (
      <View style={[styles.container, styles.pinContainer, { backgroundColor: colors.background }]}>
        <Icon name="lock" size={48} color={colors.primary} />
        <Text style={[styles.pinTitle, { color: colors.text }]}>
          {step === 'set-pin' ? 'Crear PIN de la Caja Fuerte' : 'Ingresa tu PIN'}
        </Text>
        {step === 'set-pin' && (
          <Text style={[styles.pinSubtitle, { color: colors.textSecondary }]}>
            Este PIN protegerá tu caja fuerte de fotos privadas
          </Text>
        )}
        <View style={styles.pinDots}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[
              styles.pinDot,
              { backgroundColor: pin.length > i ? colors.primary : colors.border },
            ]} />
          ))}
        </View>
        {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
        <View style={styles.pinPad}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.pinKey, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => {
                if (d === '⌫') handleDeleteDigit()
                else if (d) handlePinDigit(d)
              }}
              disabled={!d && d !== ''}
            >
              <Text style={[styles.pinKeyText, { color: colors.text }]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {step === 'set-pin' && (
          <TouchableOpacity
            style={[styles.pinConfirmBtn, { backgroundColor: pin.length === 4 ? colors.primary : colors.border }]}
            disabled={pin.length !== 4}
            onPress={handleSetPin}
          >
            <Text style={styles.pinConfirmText}>Confirmar PIN</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.border }]}>
        <Text style={[styles.topCount, { color: colors.textSecondary }]}>
          {vaultData?._count.photos ?? 0} foto(s)
        </Text>
      </View>

      {selecting && (
        <View style={[styles.actionBar, { backgroundColor: colors.primary, borderBottomColor: colors.border }]}>
          <Text style={styles.actionCount}>{selected.size} seleccionada(s)</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
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
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>La caja fuerte está vacía</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Marca fotos como privadas desde la vista previa o agrégalas desde la selección múltiple
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, marginTop: 16 },
  emptySubtext: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  topCount: { fontSize: 13 },
  actionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  actionCount: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4 },
  actionBtnLabel: { color: '#fff', fontSize: 12 },
  checkOverlay: {
    position: 'absolute', top: 4, right: 4,
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  pinContainer: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  pinTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  pinSubtitle: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  pinDots: { flexDirection: 'row', gap: 16, marginTop: 28, marginBottom: 8 },
  pinDot: { width: 18, height: 18, borderRadius: 9 },
  pinError: { color: '#ff5252', fontSize: 14, marginTop: 4 },
  pinPad: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 16,
    marginTop: 24, maxWidth: 280,
  },
  pinKey: {
    width: 72, height: 64, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  pinKeyText: { fontSize: 24, fontWeight: '500' },
  pinConfirmBtn: {
    marginTop: 24, borderRadius: 8,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  pinConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})

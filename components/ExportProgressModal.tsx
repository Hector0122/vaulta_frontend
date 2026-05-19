import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../theme'
import { type ExportProgress, getExportStatus } from '../api/client'

type Props = {
  visible: boolean
  exportId: string | null
  onDone: (message: string) => void
  onError: (message: string) => void
  onClose: () => void
}

export default function ExportProgressModal({
  visible,
  exportId,
  onDone,
  onError,
  onClose,
}: Props) {
  const { colors } = useTheme()
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const animValue = useRef(new Animated.Value(0)).current

  const onDoneRef = useRef(onDone)
  const onErrorRef = useRef(onError)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!visible || !exportId) return

    let cancelled = false
    const id = setInterval(async () => {
      try {
        const p = await getExportStatus(exportId)
        if (cancelled) return
        setProgress(p)

        if (p.status === 'done') {
          clearInterval(id)
          onDoneRef.current(p.message)
        } else if (p.status === 'error') {
          clearInterval(id)
          onErrorRef.current(p.message)
        }
      } catch {
        // keep polling
      }
    }, 1500)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [visible, exportId])

  useEffect(() => {
    if (visible) {
      animValue.setValue(0)
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    } else {
      animValue.setValue(0)
      setProgress(null)
    }
  }, [visible, animValue])

  if (!visible) return null

  const pct = progress
    ? progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0
    : 0

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => onCloseRef.current()}
          >
            <Icon name="close" size={22} color={colors.textTertiary} />
          </TouchableOpacity>

          <Icon name="file-download" size={40} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Exportando fotos
          </Text>
          {progress && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {progress.label}
            </Text>
          )}

          <View style={[styles.barBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.barFill,
                { width: `${pct}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>

          <Text style={[styles.status, { color: colors.textSecondary }]}>
            {progress?.message || 'Iniciando…'}
          </Text>
          {progress && progress.status === 'processing' && (
            <Text style={[styles.counter, { color: colors.textTertiary }]}>
              {progress.completed} de {progress.total}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    elevation: 8,
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 4 },
  title: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  barBg: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  status: { fontSize: 13, marginTop: 12, textAlign: 'center' },
  counter: { fontSize: 12, marginTop: 4 },
})

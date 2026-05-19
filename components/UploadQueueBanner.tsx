import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../theme'
import { useNetwork } from '../context/NetworkContext'
import { useToast } from '../context/ToastContext'
import { getPendingCount, processQueue, getQueue, retryFailed, clearQueue } from '../services/UploadQueue'
import type { QueueItem } from '../services/UploadQueue'

export default function UploadQueueBanner() {
  const { colors } = useTheme()
  const { isConnected } = useNetwork()
  const { showToast } = useToast()
  const [pending, setPending] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const animValue = useRef(new Animated.Value(0)).current
  const wasOffline = useRef(false)

  const refresh = useCallback(() => {
    setPending(getPendingCount())
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    if (!wasOffline.current && !isConnected) {
      wasOffline.current = true
    }
    if (wasOffline.current && isConnected && pending > 0 && !processing) {
      wasOffline.current = false
      handleProcess()
    }
    if (isConnected) {
      wasOffline.current = false
    }
  }, [isConnected])

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: pending > 0 || processing ? 1 : 0,
      useNativeDriver: true,
      friction: 10,
    }).start()
  }, [pending, processing])

  async function handleProcess() {
    setProcessing(true)
    setProgress({ completed: 0, total: getPendingCount() })

    await processQueue(
      (completed, total) => {
        setProgress({ completed, total })
      },
      (item) => {
        showToast({ message: `${item.name} subida correctamente`, type: 'success', position: 'top-right', duration: 2000 })
        refresh()
      },
      (item, error) => {
        showToast({ message: `Error: ${item.name} — ${error}`, type: 'error', position: 'top-right', duration: 5000 })
        refresh()
      },
    )

    setProcessing(false)
    setProgress({ completed: 0, total: 0 })
    refresh()
    if (getPendingCount() === 0) {
      showToast({ message: 'Todas las fotos se subieron correctamente', type: 'success', position: 'top-right', duration: 3000 })
    }
  }

  const handleRetryFailed = () => {
    const count = retryFailed()
    if (count > 0) {
      showToast({ message: `Reintentando ${count} archivo(s)`, type: 'info', position: 'top-right', duration: 2000 })
      handleProcess()
    }
  }

  const handleClearQueue = () => {
    Alert.alert(
      'Limpiar cola',
      '¿Eliminar todos los archivos pendientes de la cola? No se borrarán del dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => {
            clearQueue()
            refresh()
            showToast({ message: 'Cola limpiada', type: 'info', position: 'top-right', duration: 2000 })
          },
        },
      ],
    )
  }

  const handleShowErrors = () => {
    const failed = getQueue().filter(i => i.status === 'failed')
    if (failed.length === 0) return
    const lines = failed
      .map(i => `• ${i.name}\n  ${i.errorMessage || 'Error desconocido'}`)
      .join('\n\n')
    Alert.alert(`Fallos (${failed.length})`, lines, [{ text: 'Cerrar' }])
  }

  if (pending === 0 && !processing) return null

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  })

  const failedCount = getQueue().filter(i => i.status === 'failed').length

  return (
    <Animated.View
      style={[styles.banner, { backgroundColor: processing ? colors.primary : colors.offline, transform: [{ translateY }] }]}
    >
      <View style={styles.content}>
        <Icon
          name={processing ? 'cloud-upload' : 'cloud-queue'}
          size={18}
          color="#fff"
        />
        <Text style={styles.text}>
          {processing
            ? `Subiendo ${progress.completed}/${progress.total}…`
            : `${pending} archivo(s) pendiente(s) de subir`
          }
        </Text>
      </View>

      {failedCount > 0 && !processing && (
        <>
          <TouchableOpacity style={styles.retryBtn} onPress={handleShowErrors}>
            <Icon name="info-outline" size={18} color="#fff" />
            <Text style={styles.retryText}>Ver errores</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetryFailed}>
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </>
      )}

      {!processing && (
        <TouchableOpacity style={styles.retryBtn} onPress={handleClearQueue}>
          <Icon name="close" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {!processing && pending > 0 && isConnected && (
        <TouchableOpacity style={styles.retryBtn} onPress={handleProcess}>
          <Icon name="cloud-upload" size={18} color="#fff" />
          <Text style={styles.retryText}>Subir ahora</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 999,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
})

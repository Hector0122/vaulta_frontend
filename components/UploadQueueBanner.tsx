import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme } from '../theme'
import { useNetwork } from '../context/NetworkContext'
import { useToast } from '../context/ToastContext'
import { motion, radius, iconSize } from '../tokens'
import {
  getPendingCount,
  processQueue,
  getQueue,
  getRunState,
  retryFailed,
  clearQueue,
  subscribeQueue,
} from '../services/UploadQueue'

export default function UploadQueueBanner() {
  const { colors } = useTheme()
  const { isConnected } = useNetwork()
  const { showToast } = useToast()
  const [pending, setPending] = useState(getPendingCount)
  const [run, setRun] = useState(getRunState)
  const animValue = useSharedValue(0)
  const wasOffline = useRef(false)
  const processing = run.running

  const refresh = useCallback(() => {
    setPending(getPendingCount())
    setRun(getRunState())
  }, [])

  useEffect(() => subscribeQueue(refresh), [refresh])

  const handleProcess = useCallback(async () => {
    const result = await processQueue()
    if (result.total === 0) return
    showToast(
      result.failed > 0
        ? {
            message: `${result.completed} subidas, ${result.failed} fallaron`,
            type: 'error',
            position: 'top-right',
            duration: 4000,
          }
        : {
            message: `${result.completed} subidas correctamente`,
            type: 'success',
            position: 'top-right',
            duration: 3000,
          },
    )
  }, [showToast])

  useEffect(() => {
    if (!wasOffline.current && !isConnected) {
      wasOffline.current = true
    }
    if (wasOffline.current && isConnected && pending > 0 && !processing) {
      wasOffline.current = false
      retryFailed()
      handleProcess()
    }
    if (isConnected) {
      wasOffline.current = false
    }
  }, [isConnected, handleProcess, pending, processing])

  useEffect(() => {
    animValue.value = withSpring(pending > 0 || processing ? 1 : 0, motion.spring.gentle)
  }, [pending, processing, animValue])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(animValue.value, [0, 1], [80, 0]) }],
  }))

  const handleRetryFailed = () => {
    const count = retryFailed()
    if (count > 0) {
      showToast({
        message: `Reintentando ${count} archivo(s)`,
        type: 'info',
        position: 'top-right',
        duration: 2000,
      })
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
            showToast({
              message: 'Cola limpiada',
              type: 'info',
              position: 'top-right',
              duration: 2000,
            })
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

  const failedCount = getQueue().filter(i => i.status === 'failed').length

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: processing ? colors.primary : colors.offline },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <Icon
          name={processing ? 'cloud-upload-outline' : 'cloud-outline'}
          size={iconSize.sm}
          color="#fff"
        />
        <Text style={styles.text}>
          {processing
            ? `Subiendo ${run.completed}/${run.total}${run.failed ? ` · ${run.failed} fallaron` : ''}…`
            : `${pending} archivo(s) pendiente(s) de subir`}
        </Text>
      </View>

      {failedCount > 0 && !processing && (
        <>
          <TouchableOpacity style={styles.retryBtn} onPress={handleShowErrors}>
            <Icon name="information-outline" size={iconSize.sm} color="#fff" />
            <Text style={styles.retryText}>Ver errores</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetryFailed}>
            <Icon name="refresh" size={iconSize.sm} color="#fff" />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </>
      )}

      {!processing && (
        <TouchableOpacity style={styles.retryBtn} onPress={handleClearQueue}>
          <Icon name="close" size={iconSize.sm} color="#fff" />
        </TouchableOpacity>
      )}

      {!processing && pending > 0 && isConnected && (
        <TouchableOpacity style={styles.retryBtn} onPress={handleProcess}>
          <Icon name="cloud-upload-outline" size={iconSize.sm} color="#fff" />
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
    borderRadius: radius.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
})

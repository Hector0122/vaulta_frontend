import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
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
import { useAuth } from '../context/AuthContext'
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
  updateItemStatus,
  removeFromQueue,
  type QueueItem,
} from '../services/UploadQueue'

const STATUS_LABEL: Record<QueueItem['status'], string> = {
  pending: 'Pendiente',
  uploading: 'Subiendo…',
  failed: 'Falló',
  cancelled: 'Cancelado',
}

export default function UploadQueueBanner() {
  const { colors } = useTheme()
  const { isConnected } = useNetwork()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [pending, setPending] = useState(getPendingCount)
  const [run, setRun] = useState(getRunState)
  const [showDetail, setShowDetail] = useState(false)
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

  // Resume whatever was left in the queue when the app was closed.
  useEffect(() => {
    if (user && isConnected && getPendingCount() > 0) handleProcess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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
    animValue.value = withSpring(
      pending > 0 || processing ? 1 : 0,
      motion.spring.gentle,
    )
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
            setShowDetail(false)
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

  const handleRetryOne = (id: string) => {
    updateItemStatus(id, 'pending')
    if (isConnected) handleProcess()
  }

  if (pending === 0 && !processing) return null

  const queue = getQueue()
  const failedCount = queue.filter(i => i.status === 'failed').length

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: processing ? colors.primary : colors.offline },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={() => setShowDetail(true)}
      >
        <Icon
          name={processing ? 'cloud-upload-outline' : 'cloud-outline'}
          size={iconSize.sm}
          color="#fff"
        />
        <Text style={styles.text}>
          {processing
            ? `Subiendo ${run.completed}/${run.total}${
                run.failed ? ` · ${run.failed} fallaron` : ''
              }…`
            : `${pending} archivo(s) pendiente(s) de subir`}
        </Text>
        <Icon name="chevron-up" size={iconSize.sm} color="#fff" />
      </TouchableOpacity>

      {failedCount > 0 && !processing && (
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetryFailed}>
          <Icon name="refresh" size={iconSize.sm} color="#fff" />
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      )}

      {!processing && pending > 0 && isConnected && (
        <TouchableOpacity style={styles.retryBtn} onPress={handleProcess}>
          <Icon name="cloud-upload-outline" size={iconSize.sm} color="#fff" />
          <Text style={styles.retryText}>Subir ahora</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Cola de subida ({queue.length})
              </Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Icon name="close" size={iconSize.md} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={queue}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <View style={[styles.row, { borderColor: colors.border }]}>
                  <View style={styles.rowText}>
                    <Text
                      style={[styles.rowName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        color:
                          item.status === 'failed'
                            ? colors.danger
                            : colors.textSecondary,
                      }}
                      numberOfLines={2}
                    >
                      {item.status === 'failed' && item.errorMessage
                        ? item.errorMessage
                        : STATUS_LABEL[item.status]}
                    </Text>
                  </View>
                  {item.status === 'failed' && !processing && (
                    <TouchableOpacity onPress={() => handleRetryOne(item.id)}>
                      <Icon
                        name="refresh"
                        size={iconSize.md}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                  {item.status !== 'uploading' && (
                    <TouchableOpacity onPress={() => removeFromQueue(item.id)}>
                      <Icon
                        name="close"
                        size={iconSize.md}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />

            {!processing && (
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: colors.danger }]}
                onPress={handleClearQueue}
              >
                <Text style={[styles.clearText, { color: colors.danger }]}>
                  Limpiar cola
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: radius.xs,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearText: {
    fontWeight: '700',
  },
})

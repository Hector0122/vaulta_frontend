import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { launchImageLibrary, launchCamera } from 'react-native-image-picker'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme } from '../../theme'
import RNFS from 'react-native-fs'
import { useToast } from '../../context/ToastContext'
import { useNetwork } from '../../context/NetworkContext'
import { getToken } from '../../api/client'
import { BASE_URL } from '../../api/server'
import { addToQueue } from '../../services/UploadQueue'
import type { StackNavProp, UploadRouteProp } from '../../types/navigation'

const MAX_FILE_SIZE = 500 * 1024 * 1024

export default function UploadScreen() {
  const navigation = useNavigation<StackNavProp>()
  const route = useRoute<UploadRouteProp>()
  const { colors } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const { isConnected } = useNetwork()
  const cameraUri = route.params?.imageUri
  const cameraType = route.params?.imageType
  const [images, setImages] = useState<
    { uri: string; name: string; type?: string }[]
  >(() => {
    if (!cameraUri) return []
    const ext = cameraUri.split('.').pop()?.toLowerCase() ?? ''
    const videoExts = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'])
    if (cameraType) {
      return [{ uri: cameraUri, name: `capture-${Date.now()}.${cameraType.startsWith('video') ? 'mp4' : 'jpg'}`, type: cameraType }]
    }
    const isVideo = videoExts.has(ext)
    return [{ uri: cameraUri, name: `capture-${Date.now()}.${isVideo ? ext : 'jpg'}`, type: isVideo ? 'video/mp4' : 'image/jpeg' }]
  })
  const [uploading, setUploading] = useState(false)
  const { showToast } = useToast()

  const colCount = 3
  const gap = 4
  const thumbSize = (screenWidth - 32 - gap * (colCount - 1)) / colCount

  const pickImages = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed',
      quality: 1,
      selectionLimit: 0,
    })

    if (!result.assets) return
    const valid = result.assets
      .filter(a => !a.fileSize || a.fileSize <= MAX_FILE_SIZE)
      .map(a => ({
        uri: a.uri!,
        name:
          a.fileName ||
          `file-${Date.now()}.${a.type?.startsWith('video') ? 'mp4' : 'jpg'}`,
        type: a.type || 'image',
      }))

    if (valid.length !== result.assets.length) {
      Alert.alert(
        'Algunos archivos se omitieron',
        'El límite es 500 MB por archivo',
      )
    }
    if (valid.length > 0) setImages(prev => [...prev, ...valid])
  }, [])

  const takePhoto = useCallback(async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 1,
      saveToPhotos: true,
    })
    if (result.assets?.[0]?.uri) {
      const asset = result.assets[0]
      let uri = asset.uri!

      const ext = asset.fileName?.split('.').pop() || 'jpg'
      const tempPath = `${RNFS.CachesDirectoryPath}/capture-${Date.now()}.${ext}`
      try {
        await RNFS.copyFile(uri, tempPath)
        uri = tempPath
      } catch {}

      setImages(prev => [
        ...prev,
        {
          uri,
          name: asset.fileName || `capture-${Date.now()}.jpg`,
          type: asset.type || 'image',
        },
      ])
    }
  }, [])

  const takeVideo = useCallback(async () => {
    const result = await launchCamera({
      mediaType: 'video',
      videoQuality: 'high',
      saveToPhotos: true,
    })
    if (result.assets?.[0]?.uri) {
      const asset = result.assets[0]
      let uri = asset.uri!

      const ext = asset.fileName?.split('.').pop() || 'mp4'
      const tempPath = `${RNFS.CachesDirectoryPath}/capture-${Date.now()}.${ext}`
      try {
        await RNFS.copyFile(uri, tempPath)
        uri = tempPath
      } catch {}

      setImages(prev => [
        ...prev,
        {
          uri,
          name: asset.fileName || `capture-${Date.now()}.mp4`,
          type: asset.type || 'video',
        },
      ])
    }
  }, [])

  const removeImage = useCallback((uri: string) => {
    setImages(prev => prev.filter(i => i.uri !== uri))
  }, [])

  async function uploadBatch() {
    if (images.length === 0) return

    if (!isConnected) {
      const count = addToQueue(
        images.map(img => ({
          uri: img.uri,
          name: img.name,
          type: img.type?.startsWith('video') ? 'video/mp4' : 'image/jpeg',
        })),
      )
      showToast({
        message: `${count} archivo(s) encolados para cuando tengas conexión`,
        type: 'info',
        position: 'top-right',
        duration: 3000,
      })
      navigation.goBack()
      return
    }

    setUploading(true)

    const resolved = await Promise.all(
      images.map(async img => {
        let uri = img.uri
        if (Platform.OS === 'android' && uri.startsWith('content://')) {
          const ext = img.name.split('.').pop() || 'jpg'
          const tmp = `${RNFS.CachesDirectoryPath}/upload-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          try {
            await RNFS.copyFile(uri, tmp)
            uri = tmp
          } catch {}
        } else if (Platform.OS !== 'android') {
          uri = uri.replace('file://', '')
        }
        return { ...img, uri }
      }),
    )

    const formData = new FormData()
    for (const img of resolved) {
      formData.append('files', {
        uri: img.uri,
        type: img.type?.startsWith('video') ? 'video/mp4' : 'image/jpeg',
        name: img.name,
      })
    }

    showToast({
      message: 'Subiendo archivos…',
      type: 'info',
      position: 'top-right',
      duration: 2000,
    })
    navigation.goBack()

    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/photos/upload-batch`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        console.error(`Upload failed (${res.status}): ${text}`)
        showToast({
          message: 'Error al iniciar la subida',
          type: 'error',
          position: 'top-right',
          duration: 3000,
        })
      }
    } catch (e) {
      console.error('Upload network error:', e)
      const count = addToQueue(
        resolved.map(img => ({
          uri: img.uri,
          name: img.name,
          type: img.type?.startsWith('video') ? 'video/mp4' : 'image/jpeg',
        })),
      )
      showToast({
        message: `Error de red: ${count} archivo(s) encolados`,
        type: 'error',
        position: 'top-right',
        duration: 3000,
      })
    }
  }

  const rows: ({ uri: string; name: string; type?: string } | null)[][] = []
  if (images.length > 0 && !cameraUri) {
    const allItems = !uploading ? [...images, null] : images
    for (let i = 0; i < allItems.length; i += colCount) {
      rows.push(allItems.slice(i, i + colCount))
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {images.length > 0 ? (
        cameraUri ? (
          <View style={styles.cameraPreviewWrap}>
            <Image
              source={{ uri: cameraUri }}
              style={styles.cameraPreview}
              resizeMode="contain"
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.gridContainer}>
            <View style={styles.grid}>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  {row.map((item, ci) => {
                    const isLast = ci === row.length - 1
                    if (item === null) {
                      return (
                        <TouchableOpacity
                          key="add-more"
                          style={[
                            styles.addMore,
                            {
                              width: thumbSize,
                              height: thumbSize,
                              backgroundColor: colors.surfaceAlt,
                              marginRight: isLast ? 0 : gap,
                            },
                          ]}
                          onPress={pickImages}
                        >
                          <Icon name="plus" size={28} color={colors.primary} />
                        </TouchableOpacity>
                      )
                    }
                    return (
                      <View
                        key={`${item.uri}-${ci}`}
                        style={{
                          width: thumbSize,
                          height: thumbSize,
                          marginRight: isLast ? 0 : gap,
                        }}
                      >
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.thumb}
                          resizeMode="cover"
                        />
                        {!uploading && (
                          <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => removeImage(item.uri)}
                          >
                            <Icon name="close" size={14} color="#fff" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        )
      ) : (
        <View style={styles.emptyState}>
          <Icon name="cloud-upload-outline" size={72} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Selecciona una o varias fotos
          </Text>
        </View>
      )}

      <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
        {uploading ? (
          <View style={styles.uploadingInfo}>
            <Icon name="cloud-upload-outline" size={22} color={colors.primary} />
            <Text style={[styles.uploadCount, { color: colors.textSecondary }]}>
              Subiendo {images.length} foto(s)…
            </Text>
          </View>
        ) : images.length > 0 ? (
          <View style={styles.actionRow}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {images.length} foto{images.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
              onPress={uploadBatch}
            >
              <Icon name="cloud-upload-outline" size={22} color="#fff" />
              <Text style={styles.uploadBtnText}>
                {isConnected ? 'Subir todo' : 'Subir después (sin WiFi)'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickerRow}>
            <TouchableOpacity style={styles.pickerIconBtn} onPress={pickImages}>
              <View
                style={[
                  styles.pickerCircle,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Icon name="image-multiple-outline" size={28} color={colors.primary} />
              </View>
              <Text
                style={[styles.pickerLabel, { color: colors.textSecondary }]}
              >
                Galería
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerIconBtn} onPress={takePhoto}>
              <View
                style={[
                  styles.pickerCircle,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Icon name="camera" size={28} color={colors.primary} />
              </View>
              <Text
                style={[styles.pickerLabel, { color: colors.textSecondary }]}
              >
                Foto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerIconBtn} onPress={takeVideo}>
              <View
                style={[
                  styles.pickerCircle,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Icon name="video-outline" size={28} color={colors.primary} />
              </View>
              <Text
                style={[styles.pickerLabel, { color: colors.textSecondary }]}
              >
                Video
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 16 },
  gridContainer: { padding: 16, paddingTop: 100, paddingBottom: 100 },
  cameraPreviewWrap: {
    flex: 1,
    paddingTop: 100,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  cameraPreview: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
  },
  grid: {},
  gridRow: { flexDirection: 'row', marginBottom: 4 },
  thumb: { width: '100%', height: '100%', borderRadius: 6 },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMore: {
    borderRadius: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#999',
  },
  bottomBar: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pickerIconBtn: { alignItems: 'center', gap: 6 },
  pickerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerLabel: { fontSize: 12, fontWeight: '500' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countText: { fontSize: 14, fontWeight: '500' },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  uploadingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  uploadCount: { fontSize: 14, fontWeight: '500' },
})

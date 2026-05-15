import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import ImageEditor from '@react-native-community/image-editor';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme';
import { BASE_URL } from '../../api/server';
import { getToken } from '../../api/client';

export default function UploadScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ Upload: { imageUri?: string } }, 'Upload'>>();
  const { colors } = useTheme();
  const [image, setImage] = useState<string | null>(route.params?.imageUri || null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  const extractGps = (asset: any) => {
    const exif = asset?.exif as Record<string, any> | undefined;
    const rawLat = exif?.GPSLatitude;
    const rawLng = exif?.GPSLongitude;
    const lat =
      typeof rawLat === 'number'
        ? rawLat
        : Number(rawLat?.[0] || 0) + Number(rawLat?.[1] || 0) / 60;
    const lng =
      typeof rawLng === 'number'
        ? rawLng
        : Number(rawLng?.[0] || 0) + Number(rawLng?.[1] || 0) / 60;
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setGps({ lat, lng });
    } else {
      setGps(null);
    }
  };

  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
    });

    if (result.assets && result.assets[0]) {
      if (
        result.assets[0].fileSize &&
        result.assets[0].fileSize > MAX_FILE_SIZE
      ) {
        Alert.alert('Archivo muy grande', 'El límite es 20 MB');
        return;
      }
      if (result.assets[0].uri) setImage(result.assets[0].uri);
      extractGps(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 1,
      saveToPhotos: true,
    });

    if (result.assets && result.assets[0]) {
      if (
        result.assets[0].fileSize &&
        result.assets[0].fileSize > MAX_FILE_SIZE
      ) {
        Alert.alert('Archivo muy grande', 'El límite es 20 MB');
        return;
      }
      if (result.assets[0].uri) setImage(result.assets[0].uri);
      extractGps(result.assets[0]);
    }
  };

  const handleEdit = () => {
    if (!image) return;
    Alert.alert('Editar imagen', 'Elige una opción', [
      {
        text: 'Recortar cuadrado',
        onPress: () => {
          Image.getSize(
            image,
            (width, height) => {
              const size = Math.min(width, height);
              ImageEditor.cropImage(image, {
                offset: {
                  x: Math.round((width - size) / 2),
                  y: Math.round((height - size) / 2),
                },
                size: { width: size, height: size },
                displaySize: { width: 300, height: 300 },
                resizeMode: 'cover',
              })
                .then(result => setImage(result.uri))
                .catch(() => Alert.alert('Error', 'No se pudo recortar'));
            },
            () => Alert.alert('Error', 'No se pudo obtener el tamaño'),
          );
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadImage = async () => {
    if (!image) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const filename = image.split('/').pop() || `photo-${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
        type: 'image/jpeg',
        name: filename,
      } as any);

      const token = await getToken();
      let uploadUrl = `${BASE_URL}/photos/upload`;
      if (gps) uploadUrl += `?lat=${gps.lat}&lng=${gps.lng}`;

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.onabort = () => (xhrRef.current = null);
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            xhrRef.current = null;
            if (xhr.status >= 200 && xhr.status < 300) {
              setSuccessMsg(true);
              setTimeout(() => navigation.goBack(), 800);
              resolve();
            } else {
              reject(new Error('Error al subir'));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', uploadUrl);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (error: any) {
      if (error.message !== 'canceled') {
        Alert.alert('Error', 'No se pudo subir la foto');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {successMsg && (
        <View style={styles.successBannerOuter}>
          <View style={[styles.successBanner, { backgroundColor: colors.success }]}>
            <Icon name="check-circle" size={20} color="#fff" />
            <Text style={styles.successText}>Foto subida correctamente</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={26} color={colors.text} />
      </TouchableOpacity>

      {image ? (
        <>
          <Image
            source={{ uri: image }}
            style={styles.fullPreview}
            resizeMode="contain"
          />
          {gps && (
            <View style={[styles.gpsChip, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name="location-on" size={14} color={colors.textTertiary} />
              <Text style={[styles.gpsText, { color: colors.textTertiary }]}>
                {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="cloud-upload" size={72} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Selecciona una foto
          </Text>
        </View>
      )}

      <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
        {uploading ? (
          <View style={styles.uploadingContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${uploadProgress}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {uploadProgress}%
            </Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelUpload}>
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : image ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.circleBtn, { borderColor: colors.border }]}
              onPress={handleEdit}
              disabled={successMsg}
            >
              <Icon name="crop" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
              onPress={uploadImage}
              disabled={successMsg}
            >
              <Icon name="cloud-upload" size={22} color="#fff" />
              <Text style={styles.uploadBtnText}>Subir foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickerRow}>
            <TouchableOpacity style={styles.pickerIconBtn} onPress={pickImage}>
              <View style={[styles.pickerCircle, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name="photo-library" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerIconBtn} onPress={takePhoto}>
              <View style={[styles.pickerCircle, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name="camera-alt" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Cámara</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 12,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreview: {
    flex: 1,
    width: '100%',
  },
  gpsChip: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  gpsText: {
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
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
  pickerIconBtn: {
    alignItems: 'center',
    gap: 6,
  },
  pickerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff5252',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBannerOuter: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

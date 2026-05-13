import React, { useState, useRef } from 'react';
import { View, Text, Button, Image, ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import ImageEditor from '@react-native-community/image-editor';
import { BASE_URL } from '../../api/server'
import { getToken } from '../../api/client'

export default function UploadScreen() {
  const navigation = useNavigation();
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  const extractGps = (asset: any) => {
    const exif = asset?.exif as Record<string, any> | undefined;
    if (exif?.GPSLatitude && exif?.GPSLongitude) {
      setGps({ lat: Number(exif.GPSLatitude), lng: Number(exif.GPSLongitude) });
    } else {
      setGps(null);
    }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
    });

    if (result.assets && result.assets[0]) {
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
      if (result.assets[0].uri) setImage(result.assets[0].uri);
      extractGps(result.assets[0]);
    }
  };

  const handleEdit = () => {
    if (!image) return;
    Alert.alert('Edit image', 'Choose an option', [
      {
        text: 'Crop square',
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
                .then((result) => setImage(result.uri))
                .catch(() => Alert.alert('Error', 'Could not crop image'));
            },
            () => Alert.alert('Error', 'Could not get image size'),
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
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

      const token = await getToken()
      let uploadUrl = `${BASE_URL}/photos/upload`
      if (gps) uploadUrl += `?lat=${gps.lat}&lng=${gps.lng}`

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.onabort = () => xhrRef.current = null;
      xhr.upload.onprogress = (e) => {
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {successMsg && (
        <View style={{ position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: '#4CAF50', padding: 12, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Foto subida correctamente</Text>
          </View>
        </View>
      )}
      {image && <Image source={{ uri: image }} style={{ width: 300, height: 300, marginBottom: 20 }} />}
      {gps && (
        <Text style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>
          GPS: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Galería" onPress={pickImage} disabled={uploading || successMsg} />
        <Button title="Cámara" onPress={takePhoto} disabled={uploading || successMsg} />
      </View>
      {image && (
        <View style={{ marginTop: 10, width: '100%', alignItems: 'center' }}>
          {uploading ? (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View style={progressStyles.barBg}>
                <View style={[progressStyles.barFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={progressStyles.text}>{uploadProgress}%</Text>
              <Button title="Cancelar" onPress={cancelUpload} color="#ff5252" />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Button title="Crop square" onPress={handleEdit} disabled={successMsg} />
              <Button title="Subir foto" onPress={uploadImage} disabled={successMsg} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  barBg: {
    width: '80%',
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  text: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
});

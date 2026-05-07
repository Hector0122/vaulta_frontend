import React, { useState } from 'react';
import { View, Text, Button, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { BASE_URL } from '../../api/server';

export default function UploadScreen() {
  const navigation = useNavigation();
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
    });

    if (result.assets && result.assets[0]) {
      if (result.assets[0].uri) setImage(result.assets[0].uri);
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
    }
  };

  const uploadImage = async () => {
    if (!image) return;

    setUploading(true);
    try {
      const filename = image.split('/').pop() || `photo-${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
        type: 'image/jpeg',
        name: filename,
      } as any);

      const response = await fetch(`${BASE_URL}/photos/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSuccessMsg(true);
        setTimeout(() => navigation.goBack(), 800);
      } else {
        throw new Error('Error al subir');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo subir la foto');
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
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Galería" onPress={pickImage} disabled={uploading || successMsg} />
        <Button title="Cámara" onPress={takePhoto} disabled={uploading || successMsg} />
      </View>
      {image && (
        <View style={{ marginTop: 10 }}>
          {uploading ? (
            <ActivityIndicator size="large" />
          ) : (
            <Button title="Subir foto" onPress={uploadImage} disabled={successMsg} />
          )}
        </View>
      )}
    </View>
  );
}

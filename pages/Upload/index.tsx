import React, { useState } from 'react';
import { View, Button, Image, ActivityIndicator, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

export default function UploadScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
    });

    if (result.assets && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    if (!image) return;

    setUploading(true);
    try {
      const filename = image.split('/').pop() || `photo-${Date.now()}.jpg`;
      const base64 = await RNFS.readFile(image, 'base64');

      const response = await fetch('http://localhost:3000/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, filename }),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Foto subida correctamente');
        setImage(null);
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
      {image && <Image source={{ uri: image }} style={{ width: 300, height: 300, marginBottom: 20 }} />}
      <Button title="Seleccionar foto" onPress={pickImage} disabled={uploading} />
      {image && (
        <View style={{ marginTop: 10 }}>
          {uploading ? (
            <ActivityIndicator size="large" />
          ) : (
            <Button title="Subir foto" onPress={uploadImage} />
          )}
        </View>
      )}
    </View>
  );
}

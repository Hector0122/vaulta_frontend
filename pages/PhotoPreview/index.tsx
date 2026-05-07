import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, View, Image, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, Alert, Platform, Dimensions,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { getPhotoUrl, deletePhoto } from '../../api/server';

type PhotoItem = { uri: string; filename: string };

type PhotoPreviewRouteProp = RouteProp<{ PhotoPreview: { photos: PhotoItem[]; initialIndex: number } }, 'PhotoPreview'>;

function PhotoPage({ item, onDelete }: { item: PhotoItem; onDelete: (f: string) => void }) {
  const [fullUri, setFullUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPhotoUrl(item.filename)
      .then(setFullUri)
      .catch(() => setFullUri(item.uri))
      .finally(() => setLoading(false));
  }, [item.filename, item.uri]);

  const handleDownload = async () => {
    const uri = fullUri || item.uri;
    try {
      const ext = Platform.OS === 'android' ? 'jpg' : 'JPEG';
      const dest = `${RNFS.DocumentDirectoryPath}/download_${Date.now()}.${ext}`;
      await RNFS.downloadFile({ fromUrl: uri, toFile: dest }).promise;
      if (Platform.OS === 'android') await RNFS.scanFile(dest);
      Alert.alert('Descargada', `Foto guardada en ${dest}`);
    } catch {
      Alert.alert('Error', 'No se pudo descargar la foto');
    }
  };

  const handleShare = async () => {
    const uri = fullUri || item.uri;
    try {
      const ext = Platform.OS === 'android' ? 'jpg' : 'JPEG';
      const localPath = `${RNFS.CachesDirectoryPath}/share_${Date.now()}.${ext}`;
      await RNFS.downloadFile({ fromUrl: uri, toFile: localPath }).promise;
      await Share.open({
        url: Platform.OS === 'android' ? `file://${localPath}` : localPath,
        type: 'image/jpeg',
      });
    } catch {
      Alert.alert('Error', 'No se pudo compartir la foto');
    }
  };

  const handleDelete = () => {
    Alert.alert('Eliminar foto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await deletePhoto(item.filename);
            onDelete(item.filename);
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la foto');
          }
        },
      },
    ]);
  };

  return (
    <View style={pageStyles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={pageStyles.loader} />
      ) : (
        <Image source={{ uri: fullUri || item.uri }} style={pageStyles.image} resizeMode="contain" />
      )}
      <View style={pageStyles.actions}>
        <TouchableOpacity style={pageStyles.button} onPress={handleDownload}>
          <Icon name="download" size={28} color="#fff" />
          <Text style={pageStyles.label}>Descargar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pageStyles.button} onPress={handleShare}>
          <Icon name="share" size={28} color="#fff" />
          <Text style={pageStyles.label}>Compartir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[pageStyles.button, pageStyles.deleteButton]} onPress={handleDelete}>
          <Icon name="delete" size={28} color="#fff" />
          <Text style={pageStyles.label}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pageStyles = StyleSheet.create({
  container: { width: Dimensions.get('window').width, flex: 1, backgroundColor: '#000' },
  loader: { flex: 1 },
  image: { flex: 1 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: '#111',
  },
  button: { alignItems: 'center', padding: 10 },
  deleteButton: {},
  label: { color: '#fff', fontSize: 12, marginTop: 4 },
});

export default function PhotoPreview() {
  const route = useRoute<PhotoPreviewRouteProp>();
  const navigation = useNavigation();
  const { photos: initialPhotos, initialIndex } = route.params;
  const [items, setItems] = useState(initialPhotos);
  const listRef = useRef<FlatList>(null);

  const handleDelete = useCallback((filename: string) => {
    const remaining = items.filter(i => i.filename !== filename);
    if (remaining.length === 0) {
      navigation.goBack();
      return;
    }
    const deletedIdx = items.findIndex(i => i.filename === filename);
    setItems(remaining);
    if (deletedIdx >= remaining.length) {
      listRef.current?.scrollToIndex({ index: remaining.length - 1, animated: false });
    }
  }, [items, navigation]);

  const renderItem = useCallback(({ item }: { item: PhotoItem }) => (
    <PhotoPage item={item} onDelete={handleDelete} />
  ), [handleDelete]);

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={item => item.filename}
      renderItem={renderItem}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={initialIndex}
      getItemLayout={(_, index) => ({
        length: Dimensions.get('window').width,
        offset: Dimensions.get('window').width * index,
        index,
      })}
    />
  );
}
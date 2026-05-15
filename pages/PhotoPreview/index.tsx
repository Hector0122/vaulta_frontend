import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, View, Image, StyleSheet, TouchableOpacity, Text, TextInput,
  ActivityIndicator, Alert, Platform, useWindowDimensions,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { useAuth } from '../../context/AuthContext';
import { SkeletonBox } from '../../components/Skeleton';
import ZoomableImage from '../../components/ZoomableImage';
import { getPhotoUrl, deletePhoto, toggleFavorite, getShareLink, addTag, removeTag } from '../../api/client';
import { isCached, cachePhoto, removeCachedPhoto, offlinePath } from '../../api/offline';

type PhotoItem = { uri: string; id: string; tags?: string[] };

type PhotoPreviewRouteProp = RouteProp<{ PhotoPreview: { photos: PhotoItem[]; initialIndex: number } }, 'PhotoPreview'>;

function PhotoPage({ item, onDelete, onFavoriteToggle, userId }: { item: PhotoItem; onDelete: (f: string) => void; onFavoriteToggle: (id: string) => void; userId: string }) {
  const [fullUri, setFullUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [offlineCached, setOfflineCached] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPhotoUrl(item.id)
      .then(setFullUri)
      .catch(() => setFullUri(item.uri))
      .finally(() => setLoading(false));
    isCached(userId, item.id).then(setOfflineCached);
  }, [item.id, item.uri, userId]);

  const handleToggleFav = async () => {
    try {
      const fav = await toggleFavorite(item.id);
      setIsFav(fav);
      onFavoriteToggle(item.id);
    } catch {
      Alert.alert('Error', 'No se pudo cambiar favorito');
    }
  };

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

  const handleShareLink = async () => {
    try {
      const url = await getShareLink(item.id);
      await Share.open({ url, message: 'Mira esta foto 📸' });
    } catch {
      // user cancelled share sheet — not an error
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

  const handleOfflineToggle = async () => {
    if (offlineLoading) return;
    setOfflineLoading(true);
    try {
      if (offlineCached) {
        await removeCachedPhoto(userId, item.id);
        setOfflineCached(false);
      } else {
        const uri = fullUri || item.uri;
        await cachePhoto(userId, item.id, uri);
        setOfflineCached(true);
      }
    } catch {
      Alert.alert('Error', 'No se pudo gestionar el archivo offline');
    } finally {
      setOfflineLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Eliminar foto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await deletePhoto(item.id);
            onDelete(item.id);
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la foto');
          }
        },
      },
    ]);
  };

  const handleAddTag = async () => {
    const t = tagInput.trim();
    if (!t) return;
    try {
      const updated = await addTag(item.id, t);
      setTags(updated);
      setTagInput('');
    } catch {
      Alert.alert('Error', 'No se pudo añadir la etiqueta');
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      const updated = await removeTag(item.id, tag);
      setTags(updated);
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la etiqueta');
    }
  };

  return (
    <View style={pageStyles.container}>
      {loading ? (
        <SkeletonBox width="100%" height="100%" borderRadius={0} />
      ) : (
        <ZoomableImage
          uri={offlineCached ? `file://${offlinePath(userId, item.id)}` : fullUri || item.uri}
        />
      )}
      {tags.length > 0 && (
        <View style={pageStyles.tagRow}>
          {tags.map(t => (
            <TouchableOpacity key={t} style={pageStyles.tagChip} onPress={() => handleRemoveTag(t)}>
              <Text style={pageStyles.tagText}>{t} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={pageStyles.tagInputRow}>
        <TextInput
          style={pageStyles.tagInput}
          placeholder="Añadir etiqueta..."
          placeholderTextColor="#999"
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
        />
      </View>
      <View style={pageStyles.actions}>
        <TouchableOpacity style={pageStyles.button} onPress={handleDownload}>
          <Icon name="download" size={28} color="#fff" />
          <Text style={pageStyles.label}>Descargar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pageStyles.button} onPress={handleShare}>
          <Icon name="share" size={28} color="#fff" />
          <Text style={pageStyles.label}>Compartir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pageStyles.button} onPress={handleShareLink}>
          <Icon name="link" size={28} color="#fff" />
          <Text style={pageStyles.label}>Enlace</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pageStyles.button} onPress={handleOfflineToggle}>
          <Icon name={offlineCached ? 'cloud-download' : 'cloud-off'} size={28} color="#4fc3f7" />
          <Text style={pageStyles.label}>{offlineCached ? 'Offline' : 'Guardar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pageStyles.button} onPress={handleToggleFav}>
          <Icon name={isFav ? 'favorite' : 'favorite-border'} size={28} color="#ff4081" />
          <Text style={pageStyles.label}>Favorito</Text>
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
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1 },
  image: { flex: 1 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
  },
  tagChip: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: { color: '#ccc', fontSize: 13 },
  tagInputRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#fff',
  },
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
  const { user } = useAuth();
  const route = useRoute<PhotoPreviewRouteProp>();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const { photos: initialPhotos, initialIndex } = route.params;
  const [items, setItems] = useState(initialPhotos);
  const listRef = useRef<FlatList>(null);

  const handleDelete = useCallback((id: string) => {
    const remaining = items.filter(i => i.id !== id);
    if (remaining.length === 0) {
      navigation.goBack();
      return;
    }
    const deletedIdx = items.findIndex(i => i.id === id);
    setItems(remaining);
    if (deletedIdx >= remaining.length) {
      listRef.current?.scrollToIndex({ index: remaining.length - 1, animated: false });
    }
  }, [items, navigation]);

  const handleFavoriteToggle = useCallback((_id: string) => {
    // no-op — favoritesFilter will refresh on next Home focus
  }, []);

  const renderItem = useCallback(({ item }: { item: PhotoItem }) => (
    <PhotoPage item={item} onDelete={handleDelete} onFavoriteToggle={handleFavoriteToggle} userId={user?.id || ''} />
  ), [handleDelete, handleFavoriteToggle, user?.id]);

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={initialIndex}
      getItemLayout={(_, index) => ({
        length: screenWidth,
        offset: screenWidth * index,
        index,
      })}
    />
  );
}
import React, { useCallback, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import MasonryList from 'react-native-masonry-list';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

import { fetchPhotosPage, deletePhoto } from '../../api/server';
import { loadCachedPhotos, saveCachedPhotos } from '../../api/cache';

type HomeStackParamList = {
  Main: undefined;
  Upload: undefined;
  PhotoPreview: {
    photos: { uri: string; filename: string }[];
    initialIndex: number;
  };
};

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Main'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

type Photo = { uri: string; date: string };

const PHOTO_HEIGHT = 250;

function filenameFromUri(uri: string): string {
  const path = uri.split('?')[0];
  const parts = path.split('/');
  const key = parts[parts.length - 1];
  return key.startsWith('thumb-') ? key.slice(6) : key;
}

function groupPhotosByDate(photos: Photo[]) {
  const groups: { [date: string]: Photo[] } = {};
  photos.forEach(photo => {
    if (!groups[photo.date]) groups[photo.date] = [];
    groups[photo.date].push(photo);
  });
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return sortedDates.map(date => ({ date, photos: groups[date] }));
}

function ImageWithOverlay({
  source,
  style,
  selectedUris,
}: {
  source: any;
  style?: any;
  selectedUris?: string[];
}) {
  const uri = source?.uri;
  const selected = selectedUris?.includes(uri);
  return (
    <View>
      <Image source={source} style={style} />
      {selected && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0,122,255,0.25)',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <Icon name="check-circle" size={28} color="#fff" />
        </View>
      )}
    </View>
  );
}

function sectionHeight(count: number, columns: number): number {
  const gap = 8;
  const rows = Math.ceil(count / columns);
  return rows * PHOTO_HEIGHT + (rows - 1) * gap;
}

export function HomeScreen({ navigation }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const columns = useRef(2);
  const selecting = selectedUris.length > 0;

  const hasCache = useRef(false);

  const clearSelection = useCallback(() => setSelectedUris([]), []);
  const toggleSelection = useCallback((uri: string) => {
    setSelectedUris(prev =>
      prev.includes(uri) ? prev.filter(u => u !== uri) : [...prev, uri],
    );
  }, []);

  const handlePressImage = (data: { uri: string }) => {
    if (selecting) {
      toggleSelection(data.uri);
    } else {
      const allPhotos = photos.map(p => ({
        uri: p.uri,
        filename: filenameFromUri(p.uri),
      }));
      const idx = allPhotos.findIndex(p => p.uri === data.uri);
      navigation.navigate('PhotoPreview', {
        photos: allPhotos,
        initialIndex: Math.max(idx, 0),
      });
    }
  };

  const handleLongPressImage = (data: { uri: string }) => {
    if (!selecting) {
      setSelectedUris([data.uri]);
    }
  };

  const selectedFilenames = selectedUris.map(filenameFromUri);

  const handleBatchDelete = () => {
    Alert.alert(
      `Eliminar ${selectedFilenames.length} foto(s)`,
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await Promise.allSettled(selectedFilenames.map(deletePhoto));
            clearSelection();
            loadPhotos();
          },
        },
      ],
    );
  };

  const handleBatchDownload = async () => {
    for (const uri of selectedUris) {
      try {
        const ext = Platform.OS === 'android' ? 'jpg' : 'JPEG';
        const dest = `${
          RNFS.DocumentDirectoryPath
        }/download_${Date.now()}.${ext}`;
        await RNFS.downloadFile({ fromUrl: uri, toFile: dest }).promise;
        if (Platform.OS === 'android') await RNFS.scanFile(dest);
      } catch {}
    }
    Alert.alert(
      'Descargadas',
      `${selectedFilenames.length} foto(s) guardada(s)`,
    );
    clearSelection();
  };

  const handleBatchShare = async () => {
    const urls = selectedUris.map(u => (Platform.OS === 'android' ? u : u));
    try {
      await Share.open({
        urls,
        type: 'image/jpeg',
      });
    } catch {}
    clearSelection();
  };

  const loadPhotos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setError(null);

    if (!isRefresh) {
      const cached = await loadCachedPhotos();
      if (cached) {
        hasCache.current = true;
        setPhotos(cached);
        setLoading(false);
      }
    }

    try {
      const data = await fetchPhotosPage();
      setPhotos(data.photos);
      setNextToken(data.nextToken);
      setHasMore(data.nextToken !== null);
      saveCachedPhotos(data.photos);
      hasCache.current = true;
    } catch {
      if (!hasCache.current) setError('No se pudieron cargar las fotos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMorePhotos = useCallback(async () => {
    if (loadingMore || !hasMore || !nextToken) return;
    setLoadingMore(true);
    try {
      const data = await fetchPhotosPage(nextToken);
      setPhotos(prev => [...prev, ...data.photos]);
      setNextToken(data.nextToken);
      setHasMore(data.nextToken !== null);
    } catch {
      // fail silently
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextToken]);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 300 && !loadingMore && hasMore && nextToken) {
      loadMorePhotos();
    }
  }, [loadingMore, hasMore, nextToken, loadMorePhotos]);

  const onRefresh = useCallback(() => loadPhotos(true), [loadPhotos]);

  useFocusEffect(
    useCallback(() => {
      clearSelection();
      loadPhotos();
    }, [loadPhotos, clearSelection]),
  );

  const grouped = groupPhotosByDate(photos);

  if (loading) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        nestedScrollEnabled
        contentContainerStyle={
          !error && photos.length === 0 ? styles.centeredContainer : undefined
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {selecting && (
          <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={clearSelection}>
              <Text style={styles.selectionCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.selectionCount}>
              {selectedUris.length} seleccionada(s)
            </Text>
            <View style={{ width: 70 }} />
          </View>
        )}
        {error ? (
          <View style={styles.stateContainer}>
            <Icon name="error-outline" size={56} color="#ccc" />
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadPhotos()}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.stateContainer}>
            <Icon name="photo-library" size={72} color="#ddd" />
            <Text style={styles.stateText}>No hay fotos aún</Text>
            <Text style={styles.stateSubtext}>Sube tu primera foto</Text>
          </View>
        ) : (
          grouped.map(section => (
            <View key={section.date} style={styles.section}>
              <Text style={styles.dateLabel}>
                {new Date(section.date).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <View
                style={{
                  height: sectionHeight(section.photos.length, columns.current),
                }}
              >
                <MasonryList
                  images={section.photos}
                  imageContainerStyle={styles.imageContainer}
                  onPressImage={handlePressImage}
                  onLongPressImage={handleLongPressImage}
                  rerender
                  customImageComponent={ImageWithOverlay}
                  customImageProps={{ selectedUris }}
                  masonryFlatListColProps={{
                    scrollEnabled: false,
                    removeClippedSubviews: false,
                  }}
                />
              </View>
            </View>
          ))
        )}
        {loadingMore && (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
        {!hasMore && photos.length > 0 && (
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ textAlign: 'center', color: '#999', fontSize: 13 }}>
              Todas las fotos cargadas
            </Text>
          </View>
        )}
      </ScrollView>
      {selecting ? (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            style={styles.selectionAction}
            onPress={handleBatchDownload}
          >
            <Icon name="download" size={24} color="#fff" />
            <Text style={styles.selectionActionLabel}>Descargar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectionAction}
            onPress={handleBatchShare}
          >
            <Icon name="share" size={24} color="#fff" />
            <Text style={styles.selectionActionLabel}>Compartir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectionAction}
            onPress={handleBatchDelete}
          >
            <Icon name="delete" size={24} color="#ff5252" />
            <Text style={[styles.selectionActionLabel, { color: '#ff5252' }]}>
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('Upload')}
        >
          <Icon name="add-a-photo" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  stateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  stateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  section: { marginBottom: 24 },
  dateLabel: { fontSize: 18, fontWeight: 'bold', margin: 8 },
  imageContainer: { borderRadius: 5 },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  selectionCancel: { fontSize: 16, color: '#007AFF' },
  selectionCount: { fontSize: 16, fontWeight: '600', color: '#333' },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: '#222',
  },
  selectionAction: { alignItems: 'center', padding: 6 },
  selectionActionLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
});

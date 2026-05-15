import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  memo,
} from 'react';
import {
  ScrollView,
  View,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Animated,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

import {
  fetchPhotosPage,
  deletePhoto,
  authenticatedGet,
  getToken,
} from '../../api/client';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { loadCachedPhotos, saveCachedPhotos } from '../../api/cache';
import { getCachedIds } from '../../api/offline';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme';
import { SkeletonPhotoGrid } from '../../components/Skeleton';
import FadeInView from '../../components/FadeInView';

type HomeStackParamList = {
  Main: undefined;
  Upload: { imageUri?: string };
  PhotoPreview: {
    photos: { uri: string; id: string; tags?: string[] }[];
    initialIndex: number;
  };
  Profile: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Main'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

type Photo = {
  uri: string;
  date: string;
  id: string;
  favorite: boolean;
  tags: string[];
  blurred: boolean;
};

const PHOTO_HEIGHT = 250;

function groupPhotosByDate(photos: Photo[]) {
  const groups: { [date: string]: Photo[] } = {};
  photos.forEach(photo => {
    if (!groups[photo.date]) groups[photo.date] = [];
    groups[photo.date].push(photo);
  });
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return sortedDates.map(date => ({ date, photos: groups[date] }));
}

const GAP = 6;

const MasonryGrid = memo(function MasonryGrid({
  photos,
  colors,
  selectedUris,
  uriToFav,
  uriToOffline,
  uriToBlurred,
  selecting,
  onPress,
  onLongPress,
  onToggleSelect,
}: {
  photos: Photo[];
  colors: any;
  selectedUris: string[];
  uriToFav: Record<string, boolean>;
  uriToOffline: Record<string, boolean>;
  uriToBlurred: Record<string, boolean>;
  selecting: boolean;
  onPress: (data: { uri: string }) => void;
  onLongPress: (data: { uri: string }) => void;
  onToggleSelect: (uri: string) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const colWidth = (screenWidth - 16 - GAP) / 2;

  const cols: Photo[][] = [[], []];
  photos.forEach((p, i) => cols[i % 2].push(p));

  return (
    <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: 8 }}>
      {cols.map((col, ci) => (
        <View key={ci} style={{ flex: 1, gap: GAP }}>
          {col.map(photo => {
            const uri = photo.uri;
            const selected = selectedUris.includes(uri);
            const isFav = !selected && uriToFav[uri];
            const isOffline = !selected && !isFav && uriToOffline[uri];
            const isBlurry = !selected && uriToBlurred[uri];

            return (
              <TouchableOpacity
                key={photo.id}
                activeOpacity={0.8}
                onPress={() => {
                  if (selecting) {
                    onToggleSelect(uri);
                  } else {
                    onPress({ uri });
                  }
                }}
                onLongPress={() => {
                  if (!selecting) onLongPress({ uri });
                }}
              >
                <FadeInView>
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 6,
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: colWidth, height: PHOTO_HEIGHT }}
                      resizeMode="cover"
                    />
                    {isBlurry && (
                      <View style={{ position: 'absolute', top: 4, left: 4 }}>
                        <Icon name="blur-off" size={16} color={colors.danger} />
                      </View>
                    )}
                    {isOffline && (
                      <View
                        style={{ position: 'absolute', bottom: 4, left: 4 }}
                      >
                        <Icon
                          name="cloud-queue"
                          size={16}
                          color={colors.offline}
                        />
                      </View>
                    )}
                    {isFav && (
                      <View style={{ position: 'absolute', top: 4, right: 4 }}>
                        <Icon
                          name="favorite"
                          size={18}
                          color={colors.favorite}
                        />
                      </View>
                    )}
                    {selected && (
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          {
                            backgroundColor: colors.overlay,
                            justifyContent: 'center',
                            alignItems: 'center',
                          },
                        ]}
                      >
                        <Icon name="check-circle" size={28} color="#fff" />
                      </View>
                    )}
                  </View>
                </FadeInView>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

export function HomeScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { logout, user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [blurryOnly, setBlurryOnly] = useState(false);
  const [offlineIds, setOfflineIds] = useState<string[]>([]);
  const [recuerdos, setRecuerdos] = useState<
    {
      year: number;
      uri: string;
      id: string;
      filename: string;
      count: number;
      yearsAgo: number;
    }[]
  >([]);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fabAnim1 = useRef(new Animated.Value(0)).current;
  const fabAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showFabMenu) {
      Animated.parallel([
        Animated.spring(fabAnim1, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(fabAnim2, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
          delay: 50,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fabAnim1, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(fabAnim2, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showFabMenu, fabAnim1, fabAnim2]);

  const closeFab = () => setShowFabMenu(false);
  const selecting = selectedUris.length > 0;

  const hasCache = useRef(false);
  const favoritesOnlyRef = useRef(favoritesOnly);
  const blurryOnlyRef = useRef(blurryOnly);
  useEffect(() => {
    favoritesOnlyRef.current = favoritesOnly;
  }, [favoritesOnly]);
  useEffect(() => {
    blurryOnlyRef.current = blurryOnly;
  }, [blurryOnly]);

  const handleLogout = useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

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
        id: p.id,
        tags: p.tags,
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

  const uriToId = Object.fromEntries(photos.map(p => [p.uri, p.id]));
  const uriToFav = Object.fromEntries(photos.map(p => [p.uri, p.favorite]));
  const uriToBlurred = Object.fromEntries(photos.map(p => [p.uri, p.blurred]));
  const uriToOffline = Object.fromEntries(
    photos.map(p => [p.uri, offlineIds.includes(p.id)]),
  );

  const selectedIds = selectedUris.map(uri => uriToId[uri]).filter(Boolean);

  const handleBatchDelete = () => {
    Alert.alert(`Eliminar ${selectedIds.length} foto(s)`, '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await Promise.allSettled(selectedIds.map(deletePhoto));
          clearSelection();
          loadPhotos();
        },
      },
    ]);
  };

  const handleBatchDownload = async () => {
    const timestamp = Date.now();
    const results = await Promise.allSettled(
      selectedUris.map(async (uri, i) => {
        const ext = Platform.OS === 'android' ? 'jpg' : 'JPEG';
        const dest = `${RNFS.DocumentDirectoryPath}/download_${timestamp}_${i}.${ext}`;
        await RNFS.downloadFile({ fromUrl: uri, toFile: dest }).promise;
        if (Platform.OS === 'android') await RNFS.scanFile(dest);
      }),
    );
    const ok = results.filter(r => r.status === 'fulfilled').length;
    Alert.alert(
      'Descargadas',
      `${ok} de ${selectedIds.length} foto(s) guardada(s)`,
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

  const loadPhotos = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setError(null);

      const favOnly = favoritesOnlyRef.current;
      const blOnly = blurryOnlyRef.current;

      if (!isRefresh && !searchQuery && !favOnly && !blOnly && user?.id) {
        const cached = await loadCachedPhotos(user.id);
        if (cached) {
          hasCache.current = true;
          setPhotos(cached);
          setLoading(false);
        }
      }

      try {
        const data = await fetchPhotosPage(
          undefined,
          50,
          searchQuery || undefined,
          favOnly,
          blOnly,
        );
        setPhotos(data.photos);
        setNextToken(data.nextToken);
        setHasMore(data.nextToken !== null);
        if (!searchQuery && !favOnly && !blOnly && user?.id)
          saveCachedPhotos(user.id, data.photos);
        hasCache.current = true;
      } catch {
        if (!hasCache.current) setError('No se pudieron cargar las fotos');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, user?.id],
  );

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

  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < 300 && !loadingMore && hasMore && nextToken) {
        loadMorePhotos();
      }
    },
    [loadingMore, hasMore, nextToken, loadMorePhotos],
  );

  const fetchRecuerdos = useCallback(async () => {
    try {
      const data = await authenticatedGet<
        {
          year: number;
          uri: string;
          id: string;
          filename: string;
          count: number;
          yearsAgo: number;
        }[]
      >('photos/this-day');
      setRecuerdos(data);
    } catch {
      /* ignore */
    }
  }, []);

  const onRefresh = useCallback(() => loadPhotos(true), [loadPhotos]);

  useFocusEffect(
    useCallback(() => {
      clearSelection();
      loadPhotos();
      if (user?.id) getCachedIds(user.id).then(setOfflineIds);
      fetchRecuerdos();
    }, [loadPhotos, clearSelection, user?.id]),
  );

  const grouped = useMemo(() => groupPhotosByDate(photos), [photos]);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <SkeletonPhotoGrid colors={colors} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        nestedScrollEnabled
        contentContainerStyle={
          !error && photos.length === 0 ? styles.centeredContainer : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {selecting && (
          <View
            style={[
              styles.selectionHeader,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <TouchableOpacity onPress={clearSelection}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <Text style={[styles.selectionCount, { color: colors.text }]}>
              {selectedUris.length} seleccionada(s)
            </Text>
            <TouchableOpacity
              onPress={() =>
                setSelectedUris(
                  selectedUris.length === photos.length
                    ? []
                    : photos.map(p => p.uri),
                )
              }
            >
              <Text style={{ color: colors.primary, fontSize: 16 }}>
                {selectedUris.length === photos.length ? 'Ninguna' : 'Todo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View
          style={[
            styles.searchRow,
            {
              borderBottomColor: colors.borderLight,
              backgroundColor: colors.background,
            },
          ]}
        >
          <TextInput
            style={[
              styles.searchInput,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.inputBg,
              },
            ]}
            placeholder="Buscar por nombre..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              setNextToken(null);
              setHasMore(true);
              loadPhotos();
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setNextToken(null);
                setHasMore(true);
                loadPhotos();
              }}
            >
              <Icon name="close" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              setFavoritesOnly(v => {
                const next = !v;
                favoritesOnlyRef.current = next;
                return next;
              });
              setNextToken(null);
              setHasMore(true);
              loadPhotos();
            }}
            style={{ marginHorizontal: 4 }}
          >
            <Icon
              name={favoritesOnly ? 'favorite' : 'favorite-border'}
              size={22}
              color={colors.favorite}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setBlurryOnly(v => {
                const next = !v;
                blurryOnlyRef.current = next;
                return next;
              });
              setNextToken(null);
              setHasMore(true);
              loadPhotos();
            }}
            style={{ marginHorizontal: 4 }}
          >
            <Icon
              name={blurryOnly ? 'blur-off' : 'blur-on'}
              size={22}
              color={blurryOnly ? colors.danger : colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={{ marginLeft: 4 }}
          >
            <Icon name="person" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={{ marginLeft: 4 }}>
            <Icon name="logout" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
        {recuerdos.length > 0 && (
          <View
            style={[
              styles.recuerdosContainer,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <View style={styles.recuerdosHeader}>
              <Icon name="history" size={18} color={colors.primary} />
              <Text style={[styles.recuerdosTitle, { color: colors.text }]}>
                Recuerda...
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recuerdos.map(r => (
                <TouchableOpacity
                  key={`${r.year}-${r.id}`}
                  style={styles.recuerdoCard}
                  onPress={() =>
                    navigation.navigate('PhotoPreview', {
                      photos: [{ uri: r.uri, id: r.id }],
                      initialIndex: 0,
                    })
                  }
                >
                  <Image source={{ uri: r.uri }} style={styles.recuerdoThumb} />
                  <Text
                    style={[
                      styles.recuerdoLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Hace {r.yearsAgo} año{r.yearsAgo > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {error ? (
          <View style={styles.stateContainer}>
            <Icon name="error-outline" size={56} color={colors.textTertiary} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => loadPhotos()}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.stateContainer}>
            <Icon name="photo-library" size={72} color={colors.textTertiary} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              No hay fotos aún
            </Text>
            <Text style={[styles.stateSubtext, { color: colors.textTertiary }]}>
              Sube tu primera foto
            </Text>
          </View>
        ) : (
          grouped.map(section => (
            <View key={section.date} style={styles.section}>
              <Text style={[styles.dateLabel, { color: colors.text }]}>
                {new Date(section.date).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <MasonryGrid
                photos={section.photos}
                colors={colors}
                selectedUris={selectedUris}
                uriToFav={uriToFav}
                uriToBlurred={uriToBlurred}
                uriToOffline={uriToOffline}
                selecting={selecting}
                onPress={handlePressImage}
                onLongPress={handleLongPressImage}
                onToggleSelect={toggleSelection}
              />
            </View>
          ))
        )}
        {loadingMore && (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        {!hasMore && photos.length > 0 && (
          <View style={{ paddingVertical: 12 }}>
            <Text
              style={{
                textAlign: 'center',
                color: colors.textTertiary,
                fontSize: 13,
              }}
            >
              Todas las fotos cargadas
            </Text>
          </View>
        )}
      </ScrollView>
      {selecting ? (
        <View
          style={[
            styles.selectionBar,
            { backgroundColor: isDark ? '#000' : '#222' },
          ]}
        >
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
            <Icon name="delete" size={24} color={colors.danger} />
            <Text
              style={[styles.selectionActionLabel, { color: colors.danger }]}
            >
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {showFabMenu && (
            <Pressable style={StyleSheet.absoluteFill} onPress={closeFab} />
          )}
          <Animated.View
            style={[
              styles.fabMini,
              {
                backgroundColor: colors.surfaceAlt,
                right: 24,
                bottom: 100,
                opacity: fabAnim1,
                transform: [
                  {
                    translateY: fabAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: fabAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.fabMiniInner}
              onPress={() => {
                closeFab();
                launchImageLibrary(
                  { mediaType: 'photo', quality: 0.8 },
                  res => {
                    if (res.assets?.[0]?.uri)
                      navigation.navigate('Upload', {
                        imageUri: res.assets[0].uri,
                      });
                  },
                );
              }}
            >
              <Icon name="photo-library" size={22} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>
          <Animated.View
            style={[
              styles.fabMini,
              {
                backgroundColor: colors.surfaceAlt,
                right: 24,
                bottom: 160,
                opacity: fabAnim2,
                transform: [
                  {
                    translateY: fabAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: fabAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.fabMiniInner}
              onPress={() => {
                closeFab();
                launchCamera({ mediaType: 'photo', quality: 0.8 }, res => {
                  if (res.assets?.[0]?.uri)
                    navigation.navigate('Upload', {
                      imageUri: res.assets[0].uri,
                    });
                });
              }}
            >
              <Icon name="camera-alt" size={22} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => setShowFabMenu(v => !v)}
          >
            <Icon
              name={showFabMenu ? 'close' : 'add-a-photo'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1 },
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
    marginTop: 16,
    textAlign: 'center',
  },
  stateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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
  fabMini: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  fabMiniInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: { marginBottom: 24 },
  dateLabel: { fontSize: 18, fontWeight: 'bold', margin: 8 },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selectionCount: { fontSize: 16, fontWeight: '600' },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  selectionAction: { alignItems: 'center', padding: 6 },
  selectionActionLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  recuerdosContainer: {
    paddingVertical: 10,
    paddingLeft: 12,
  },
  recuerdosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  recuerdosTitle: { fontSize: 15, fontWeight: '600' },
  recuerdoCard: {
    marginRight: 10,
    alignItems: 'center',
    width: 100,
  },
  recuerdoThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  recuerdoLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
});

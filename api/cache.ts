import AsyncStorage from '@react-native-async-storage/async-storage';

const PHOTOS_CACHE_KEY = '@mymega_photos';

export type CachedPhoto = { uri: string; date: string; id: string; favorite: boolean; tags: string[] };

export async function loadCachedPhotos(): Promise<CachedPhoto[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PHOTOS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCachedPhotos(photos: CachedPhoto[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify(photos));
  } catch {}
}

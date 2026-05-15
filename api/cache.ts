import AsyncStorage from '@react-native-async-storage/async-storage';

export type CachedPhoto = { uri: string; date: string; id: string; favorite: boolean; tags: string[]; blurred: boolean };

function cacheKey(userId: string): string {
  return `@mymega_photos_${userId}`;
}

export async function loadCachedPhotos(userId: string): Promise<CachedPhoto[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCachedPhotos(userId: string, photos: CachedPhoto[]): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(photos));
  } catch {}
}

export async function clearCachedPhotos(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(userId));
  } catch {}
}

import { storage } from './storage';

export type CachedPhoto = { uri: string; date: string; id: string; favorite: boolean; tags: string[]; blurred: boolean; private: boolean };

function cacheKey(userId: string): string {
  return `@vaulta_photos_${userId}`;
}

export async function loadCachedPhotos(userId: string): Promise<CachedPhoto[] | null> {
  try {
    const raw = storage.getString(cacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCachedPhotos(userId: string, photos: CachedPhoto[]): Promise<void> {
  try {
    storage.set(cacheKey(userId), JSON.stringify(photos));
  } catch { console.warn('[Cache] Failed to save photos') }
}

export async function clearCachedPhotos(userId: string): Promise<void> {
  try {
    storage.delete(cacheKey(userId));
  } catch { console.warn('[Cache] Failed to clear cache') }
}

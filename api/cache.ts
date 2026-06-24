import { storage } from './storage';

export type CachedPhoto = { uri: string; fullUri: string; date: string; id: string; favorite: boolean; tags: string[]; blurred: boolean; private: boolean };

const CACHE_TTL_MS = 50 * 60 * 1000;

function cacheKey(userId: string): string {
  return `@vaulta_photos_${userId}`;
}

function metaKey(userId: string): string {
  return `@vaulta_photos_meta_${userId}`;
}

export async function loadCachedPhotos(userId: string): Promise<CachedPhoto[] | null> {
  try {
    const metaRaw = storage.getString(metaKey(userId));
    if (metaRaw) {
      const { cachedAt } = JSON.parse(metaRaw);
      if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
    }
    const raw = storage.getString(cacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCachedPhotos(userId: string, photos: CachedPhoto[]): Promise<void> {
  try {
    storage.set(cacheKey(userId), JSON.stringify(photos));
    storage.set(metaKey(userId), JSON.stringify({ cachedAt: Date.now() }));
  } catch { console.warn('[Cache] Failed to save photos') }
}

export async function clearCachedPhotos(userId: string): Promise<void> {
  try {
    storage.delete(cacheKey(userId));
    storage.delete(metaKey(userId));
  } catch { console.warn('[Cache] Failed to clear cache') }
}

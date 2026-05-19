import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const OFFLINE_DIR = `${RNFS.DocumentDirectoryPath}/offline`;

function offlineIdsKey(userId: string): string {
  return `@vaulta_offline_ids_${userId}`;
}

function offlineDir(userId: string): string {
  return `${OFFLINE_DIR}/${userId}`;
}

export function offlinePath(userId: string, photoId: string): string {
  return `${offlineDir(userId)}/${photoId}.jpg`;
}

async function ensureDir(userId: string) {
  const dir = offlineDir(userId);
  const exists = await RNFS.exists(dir);
  if (!exists) await RNFS.mkdir(dir);
}

export async function isCached(userId: string, photoId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(offlineIdsKey(userId));
    if (!raw) return false;
    const ids: string[] = JSON.parse(raw);
    if (!ids.includes(photoId)) return false;
    const exists = await RNFS.exists(offlinePath(userId, photoId));
    if (!exists) {
      const filtered = ids.filter((id: string) => id !== photoId);
      await AsyncStorage.setItem(offlineIdsKey(userId), JSON.stringify(filtered));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function getCachedIds(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(offlineIdsKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function cachePhoto(userId: string, photoId: string, remoteUrl: string, headers?: Record<string, string>): Promise<string> {
  await ensureDir(userId);
  const local = offlinePath(userId, photoId);
  const result = await RNFS.downloadFile({ fromUrl: remoteUrl, toFile: local, headers }).promise;
  if (result.statusCode < 200 || result.statusCode >= 300) {
    try { await RNFS.unlink(local); } catch { console.warn('[Offline] Failed to cleanup', local) }
    throw new Error(`Download failed with HTTP ${result.statusCode}`);
  }
  if (Platform.OS === 'android') await RNFS.scanFile(local);

  const ids = await getCachedIds(userId);
  if (!ids.includes(photoId)) {
    ids.push(photoId);
    await AsyncStorage.setItem(offlineIdsKey(userId), JSON.stringify(ids));
  }
  return `file://${local}`;
}

export async function removeCachedPhoto(userId: string, photoId: string): Promise<void> {
  const local = offlinePath(userId, photoId);
  try {
    await RNFS.unlink(local);
  } catch {}

  const ids = await getCachedIds(userId);
  const filtered = ids.filter((id: string) => id !== photoId);
  await AsyncStorage.setItem(offlineIdsKey(userId), JSON.stringify(filtered));
}

export async function clearAllOffline(userId: string): Promise<void> {
  try {
    const dir = offlineDir(userId);
    const exists = await RNFS.exists(dir);
    if (exists) await RNFS.unlink(dir);
    await AsyncStorage.removeItem(offlineIdsKey(userId));
  } catch {}
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const OFFLINE_IDS_KEY = '@mymega_offline_ids';
const OFFLINE_DIR = `${RNFS.DocumentDirectoryPath}/offline`;

async function ensureDir() {
  const exists = await RNFS.exists(OFFLINE_DIR);
  if (!exists) await RNFS.mkdir(OFFLINE_DIR);
}

export function offlinePath(photoId: string): string {
  return `${OFFLINE_DIR}/${photoId}.jpg`;
}

export async function isCached(photoId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_IDS_KEY);
    if (!raw) return false;
    const ids: string[] = JSON.parse(raw);
    return ids.includes(photoId);
  } catch {
    return false;
  }
}

export async function getCachedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function cachePhoto(photoId: string, remoteUrl: string): Promise<string> {
  await ensureDir();
  const local = offlinePath(photoId);
  await RNFS.downloadFile({ fromUrl: remoteUrl, toFile: local }).promise;
  if (Platform.OS === 'android') await RNFS.scanFile(local);

  const ids = await getCachedIds();
  if (!ids.includes(photoId)) {
    ids.push(photoId);
    await AsyncStorage.setItem(OFFLINE_IDS_KEY, JSON.stringify(ids));
  }
  return `file://${local}`;
}

export async function removeCachedPhoto(photoId: string): Promise<void> {
  const local = offlinePath(photoId);
  try {
    await RNFS.unlink(local);
  } catch {}

  const ids = await getCachedIds();
  const filtered = ids.filter((id: string) => id !== photoId);
  await AsyncStorage.setItem(OFFLINE_IDS_KEY, JSON.stringify(filtered));
}

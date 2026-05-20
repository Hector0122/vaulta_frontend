import { Platform, PermissionsAndroid } from 'react-native';
import { storage } from './storage';
import { addToQueue, getSyncedNames } from '../services/UploadQueue';

const AUTO_SYNC_ENABLED_KEY = '@vaulta_auto_sync_enabled';
const LAST_SYNC_TIME_KEY = '@vaulta_last_sync_timeÑ';

/** On first sync, look back this many days instead of scanning the full library */
const FIRST_SYNC_LOOKBACK_DAYS = 30;

/** Path substrings that identify non-camera media to skip */
const SKIP_PATH_PATTERNS = [
  'Screenshots',
  'screenshot',
  'WhatsApp',
  'Telegram',
  '.thumbnails',
  'Download',
  'Recents',
];

export function isAutoSyncEnabled(): boolean {
  return storage.getBoolean(AUTO_SYNC_ENABLED_KEY) ?? false;
}

export function setAutoSyncEnabled(enabled: boolean): void {
  storage.set(AUTO_SYNC_ENABLED_KEY, enabled);
}

export function getLastSyncTime(): number {
  return storage.getNumber(LAST_SYNC_TIME_KEY) ?? 0;
}

export function getLastSyncTimeFormatted(): string | null {
  const ts = getLastSyncTime();
  if (!ts) return null;
  return new Date(ts).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function setLastSyncTime(ts: number): void {
  storage.set(LAST_SYNC_TIME_KEY, ts);
}

export function clearLastSyncTime(): void {
  storage.set(LAST_SYNC_TIME_KEY, 0);
  // Note: syncedNames is intentionally NOT cleared here.
  // Use clearSyncedNames() only after a full nuke of the backend.
}

function shouldSkip(uri: string): boolean {
  return SKIP_PATH_PATTERNS.some(p =>
    uri.toLowerCase().includes(p.toLowerCase()),
  );
}

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp']);

function getMimeType(filename: string, nodeType: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const isVideo = nodeType === 'video' || VIDEO_EXTENSIONS.has(ext);
  if (isVideo) {
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'avi') return 'video/x-msvideo';
    if (ext === 'mkv') return 'video/x-matroska';
    if (ext === 'webm') return 'video/webm';
    return 'video/mp4';
  }
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return `image/${ext || 'jpeg'}`;
}

async function requestGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // iOS prompts automatically on first CameraRoll access
    return true;
  }
  if ((Platform.Version as number) >= 33) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
    ]);
    return (
      results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === 'granted' &&
      results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === 'granted'
    );
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  );
  return result === 'granted';
}

/** Set to true to request cancellation of an in-progress runAutoSync */
let _cancelRequested = false;

export function cancelAutoSync(): void {
  _cancelRequested = true;
}

/**
 * Scans the device gallery for new photos since the last sync and enqueues them.
 * Returns the number of new photos enqueued, or -1 if permission was denied, or -2 if cancelled.
 * Pass force=true to bypass the enabled-flag check (e.g. manual "Sync ahora" button).
 */
export async function runAutoSync(force = false): Promise<number> {
  _cancelRequested = false;
  if (!force && !isAutoSyncEnabled()) return 0;

  const granted = await requestGalleryPermission();
  if (!granted) return -1;

  const { CameraRoll } = await import('@react-native-camera-roll/camera-roll');

  const lastSync = getLastSyncTime();
  const fromTime =
    lastSync > 0
      ? lastSync
      : Date.now() - FIRST_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const syncedNames = getSyncedNames();
  const toEnqueue: { uri: string; name: string; type: string }[] = [];
  let hasNextPage = true;
  let cursor: string | undefined;

  while (hasNextPage) {
    if (_cancelRequested) {
      return -2;
    }

    const result = await CameraRoll.getPhotos({
      first: 100,
      after: cursor,
      assetType: 'All',
      fromTime,
      include: ['filename'],
    });

    for (const edge of result.edges) {
      const { node } = edge;
      const uri = node.image.uri;

      if (shouldSkip(uri)) continue;

      const filename = node.image.filename ?? `photo_${node.timestamp}.jpg`;
      if (syncedNames.has(filename)) continue;

      const normalizedUri = Platform.OS === 'ios' ? uri : uri;

      toEnqueue.push({
        uri: normalizedUri,
        name: filename,
        type: getMimeType(filename, node.type),
      });
    }

    hasNextPage = result.page_info.has_next_page;
    cursor = result.page_info.end_cursor;
  }

  if (toEnqueue.length > 0) {
    addToQueue(toEnqueue);
  }

  setLastSyncTime(Date.now());
  return toEnqueue.length;
}

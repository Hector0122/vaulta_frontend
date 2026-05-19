import { Platform } from 'react-native'
import { storage } from '../api/storage'
import { BASE_URL } from '../api/server'
import { getToken } from '../api/client'

const QUEUE_KEY = '@vaulta_upload_queue'
const SYNCED_NAMES_KEY = '@vaulta_synced_names'

export type QueueItem = {
  id: string
  uri: string
  name: string
  type: string
  createdAt: number
  status: 'pending' | 'uploading' | 'failed' | 'cancelled'
  errorMessage?: string
}

let _idCounter = Date.now()

function genId(): string {
  return `q_${++_idCounter}_${Math.random().toString(36).slice(2, 8)}`
}

function loadQueue(): QueueItem[] {
  try {
    const raw = storage.getString(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue: QueueItem[]): void {
  storage.set(QUEUE_KEY, JSON.stringify(queue))
}

export function addToQueue(
  items: Omit<QueueItem, 'id' | 'createdAt' | 'status'>[],
): number {
  const queue = loadQueue()
  const existingUris = new Set(queue.map(i => i.uri))
  const now = Date.now()
  const newItems: QueueItem[] = items
    .filter(item => !existingUris.has(item.uri))
    .map(item => ({
      ...item,
      id: genId(),
      createdAt: now,
      status: 'pending',
    }))
  if (newItems.length > 0) saveQueue([...queue, ...newItems])
  return newItems.length
}

export function getQueue(): QueueItem[] {
  return loadQueue()
}

export function getPendingCount(): number {
  return loadQueue().filter(
    i => i.status === 'pending' || i.status === 'failed',
  ).length
}

export function updateItemStatus(
  id: string,
  status: QueueItem['status'],
  errorMessage?: string,
): void {
  const queue = loadQueue()
  const idx = queue.findIndex(i => i.id === id)
  if (idx !== -1) {
    queue[idx].status = status
    if (errorMessage !== undefined) queue[idx].errorMessage = errorMessage
    saveQueue(queue)
  }
}

export function removeFromQueue(id: string): void {
  saveQueue(loadQueue().filter(i => i.id !== id))
}

export function clearQueue(): void {
  storage.set(QUEUE_KEY, '[]')
}

export function getSyncedNames(): Set<string> {
  try {
    const raw = storage.getString(SYNCED_NAMES_KEY)
    return raw
      ? new Set<string>(JSON.parse(raw) as string[])
      : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

export function markAsSynced(name: string): void {
  const names = getSyncedNames()
  names.add(name)
  storage.set(SYNCED_NAMES_KEY, JSON.stringify([...names]))
}

export function clearSyncedNames(): void {
  storage.set(SYNCED_NAMES_KEY, '[]')
}

export function retryFailed(): number {
  const queue = loadQueue()
  let count = 0
  for (const item of queue) {
    if (item.status === 'failed') {
      item.status = 'pending'
      count++
    }
  }
  saveQueue(queue)
  return count
}

export async function processQueue(
  onProgress?: (completed: number, total: number) => void,
  onItemDone?: (item: QueueItem) => void,
  onItemError?: (item: QueueItem, error: string) => void,
): Promise<void> {
  const queue = loadQueue()
  const pending = queue.filter(i => i.status === 'pending')
  if (pending.length === 0) return

  const total = pending.length
  let completed = 0

  for (const item of pending) {
    updateItemStatus(item.id, 'uploading')

    // Fix wrong MIME type for videos already in queue (e.g. image/mp4 → video/mp4)
    const ext = item.name.split('.').pop()?.toLowerCase() ?? ''
    const videoExts = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'])
    let resolvedType = item.type || 'image/jpeg'
    if (videoExts.has(ext) && resolvedType.startsWith('image/')) {
      if (ext === 'mov') resolvedType = 'video/quicktime'
      else if (ext === 'avi') resolvedType = 'video/x-msvideo'
      else if (ext === 'mkv') resolvedType = 'video/x-matroska'
      else if (ext === 'webm') resolvedType = 'video/webm'
      else resolvedType = 'video/mp4'
    }

    const formData = new FormData()
    formData.append('files', {
      uri:
        Platform.OS === 'android' ? item.uri : item.uri.replace('file://', ''),
      type: resolvedType,
      name: item.name,
    })

    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/photos/upload-batch`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
      }

      markAsSynced(item.name)
      removeFromQueue(item.id)
      completed++
      onProgress?.(completed, total)
      onItemDone?.(item)
    } catch (e: any) {
      const errMsg: string = e?.message || 'Error desconocido'
      updateItemStatus(item.id, 'failed', errMsg)
      onItemError?.(item, errMsg)
    }
  }

  onProgress?.(completed, total)
}

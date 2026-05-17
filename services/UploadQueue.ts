import { Platform } from 'react-native'
import { storage } from '../api/storage'
import { BASE_URL } from '../api/server'
import { getToken } from '../api/client'

const QUEUE_KEY = '@vaulta_upload_queue'

export type QueueItem = {
  id: string
  uri: string
  name: string
  type: string
  createdAt: number
  status: 'pending' | 'uploading' | 'failed' | 'cancelled'
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

export function addToQueue(items: Omit<QueueItem, 'id' | 'createdAt' | 'status'>[]): number {
  const queue = loadQueue()
  const now = Date.now()
  const newItems: QueueItem[] = items.map(item => ({
    ...item,
    id: genId(),
    createdAt: now,
    status: 'pending',
  }))
  saveQueue([...queue, ...newItems])
  return newItems.length
}

export function getQueue(): QueueItem[] {
  return loadQueue()
}

export function getPendingCount(): number {
  return loadQueue().filter(i => i.status === 'pending' || i.status === 'failed').length
}

export function updateItemStatus(id: string, status: QueueItem['status']): void {
  const queue = loadQueue()
  const idx = queue.findIndex(i => i.id === id)
  if (idx !== -1) {
    queue[idx].status = status
    saveQueue(queue)
  }
}

export function removeFromQueue(id: string): void {
  saveQueue(loadQueue().filter(i => i.id !== id))
}

export function clearQueue(): void {
  storage.delete(QUEUE_KEY)
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

    const formData = new FormData()
    formData.append('files', {
      uri: Platform.OS === 'android' ? item.uri : item.uri.replace('file://', ''),
      type: item.type?.startsWith('video') ? 'video/mp4' : 'image/jpeg',
      name: item.name,
    } as any)

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

      removeFromQueue(item.id)
      completed++
      onProgress?.(completed, total)
      onItemDone?.(item)
    } catch (e: any) {
      updateItemStatus(item.id, 'failed')
      onItemError?.(item, e?.message || 'Error desconocido')
    }
  }

  onProgress?.(completed, total)
}

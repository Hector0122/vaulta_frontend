import { Platform } from 'react-native'
import RNFS from 'react-native-fs'
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

let listeners: (() => void)[] = []

export function subscribeQueue(listener: () => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

function notify(): void {
  listeners.forEach(l => l())
}

function saveQueue(queue: QueueItem[]): void {
  storage.set(QUEUE_KEY, JSON.stringify(queue))
  notify()
}

export function addToQueue(
  items: Omit<QueueItem, 'id' | 'createdAt' | 'status'>[],
): number {
  const queue = loadQueue()
  const activeUris = new Set(
    queue.filter(i => i.status !== 'failed').map(i => i.uri),
  )
  const now = Date.now()
  const newItems: QueueItem[] = items
    .filter(item => !activeUris.has(item.uri))
    .map(item => ({
      ...item,
      id: genId(),
      createdAt: now,
      status: 'pending',
    }))
  if (newItems.length > 0) {
    const newUris = new Set(newItems.map(i => i.uri))
    saveQueue([
      ...queue.filter(i => i.status !== 'failed' || !newUris.has(i.uri)),
      ...newItems,
    ])
  }
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
  saveQueue([])
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

const CONCURRENCY = 3
const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'])

export type RunState = {
  running: boolean
  completed: number
  failed: number
  total: number
}
let run: RunState = { running: false, completed: 0, failed: 0, total: 0 }
let current: Promise<RunState> | null = null

export function getRunState(): RunState {
  return run
}

function resolveType(item: QueueItem): string {
  const ext = item.name.split('.').pop()?.toLowerCase() ?? ''
  let type = item.type?.includes('/') ? item.type : 'image/jpeg'
  if (VIDEO_EXTS.has(ext) && type.startsWith('image/')) {
    if (ext === 'mov') type = 'video/quicktime'
    else if (ext === 'avi') type = 'video/x-msvideo'
    else if (ext === 'mkv') type = 'video/x-matroska'
    else if (ext === 'webm') type = 'video/webm'
    else type = 'video/mp4'
  }
  return type
}

async function uploadOne(item: QueueItem): Promise<void> {
  let uploadUri = item.uri
  let tmp: string | null = null
  if (Platform.OS === 'android' && uploadUri.startsWith('content://')) {
    const ext = item.name.split('.').pop() || 'jpg'
    tmp = `${RNFS.CachesDirectoryPath}/q-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`
    try {
      await RNFS.copyFile(uploadUri, tmp)
    } catch (e: any) {
      throw new Error(
        `No se pudo leer el archivo: ${e?.message || 'error de copia'}`,
      )
    }
    uploadUri = 'file://' + tmp
  } else if (Platform.OS === 'android' && !uploadUri.startsWith('file://')) {
    uploadUri = 'file://' + uploadUri
  } else if (Platform.OS !== 'android') {
    uploadUri = uploadUri.replace('file://', '')
  }

  const formData = new FormData()
  formData.append('file', {
    uri: uploadUri,
    type: resolveType(item),
    name: item.name,
  } as any)
  const token = await getToken()

  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE_URL}/photos/upload`)
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.timeout = 10 * 60 * 1000
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`))
      }
      xhr.onerror = () => reject(new Error('Error de red'))
      xhr.ontimeout = () => reject(new Error('Timeout de subida (10 min)'))
      xhr.send(formData)
    })
  } finally {
    if (tmp) RNFS.unlink(tmp).catch(() => {})
  }
}

export function processQueue(): Promise<RunState> {
  if (current) return current
  current = (async () => {
    try {
      await drainQueue()
    } finally {
      run = { ...run, running: false }
      current = null
      notify()
    }
    return run
  })()
  return current
}

async function drainQueue(): Promise<void> {
  const queue = loadQueue()
  queue.forEach(i => {
    if (i.status === 'uploading') i.status = 'pending'
  })
  saveQueue(queue)
  run = { running: true, completed: 0, failed: 0, total: 0 }
  notify()

  let pending = queue.filter(i => i.status === 'pending')
  while (pending.length > 0) {
    run = { ...run, total: run.total + pending.length }
    notify()
    let next = 0
    const batch = pending
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, batch.length) }, async () => {
        while (next < batch.length) {
          const item = batch[next++]
          updateItemStatus(item.id, 'uploading')
          try {
            await uploadOne(item)
            markAsSynced(item.name)
            removeFromQueue(item.id)
            if (item.uri.includes(RNFS.CachesDirectoryPath))
              RNFS.unlink(item.uri.replace('file://', '')).catch(() => {})
            run = { ...run, completed: run.completed + 1 }
          } catch (e: any) {
            updateItemStatus(
              item.id,
              'failed',
              e?.message || 'Error desconocido',
            )
            run = { ...run, failed: run.failed + 1 }
          }
          notify()
        }
      }),
    )
    pending = loadQueue().filter(i => i.status === 'pending')
  }
}

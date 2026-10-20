import type { UploadBatchStatus } from '../api/client'

type ActiveUpload = {
  batchId: string
  total: number
  status?: UploadBatchStatus
}

let activeUpload: ActiveUpload | null = null
let listeners: (() => void)[] = []

export function startUploadProgress(batchId: string, total: number): void {
  activeUpload = { batchId, total }
  listeners.forEach(listener => listener())
}

export function updateUploadProgress(
  batchId: string,
  status: UploadBatchStatus,
): void {
  if (!activeUpload || activeUpload.batchId !== batchId) return
  activeUpload.status = status
  listeners.forEach(listener => listener())
}

export function clearUploadProgress(): void {
  activeUpload = null
  listeners.forEach(listener => listener())
}

export function getUploadProgress(): ActiveUpload | null {
  return activeUpload
}

export function subscribeUploadProgress(listener: () => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(item => item !== listener)
  }
}

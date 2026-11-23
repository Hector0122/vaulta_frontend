import { storage } from './storage'

// Borradores de Vaulta Estudio — solo viven en el teléfono (ver PLAN_ESTUDIO.md).

export const MAX_CAROUSEL = 10 // límite de un carrusel de Instagram

export type DraftRatio = '4:5' | '1:1'

export type Draft = {
  id: string
  photoIds: string[]
  // shortcut: thumb URL firmada (~7 días), la lista muestra placeholder si caduca; refrescar si molesta
  coverUri: string | null
  caption: string
  ratio: DraftRatio
  published: boolean
  createdAt: number
  updatedAt: number
}

const KEY = 'estudio-drafts'

function readAll(): Draft[] {
  const raw = storage.getString(KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Draft[]
  } catch (e) {
    console.warn('[estudio] borradores corruptos, se ignoran', e)
    return []
  }
}

function writeAll(drafts: Draft[]): void {
  storage.set(KEY, JSON.stringify(drafts))
}

/** Más recientes primero. */
export function listDrafts(): Draft[] {
  // reverse primero: sort es estable, así en empate gana el último creado
  return readAll().reverse().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getDraft(id: string): Draft | undefined {
  return readAll().find(d => d.id === id)
}

export function createDraft(photoIds: string[], coverUri: string | null): Draft {
  if (photoIds.length === 0 || photoIds.length > MAX_CAROUSEL) {
    throw new Error(`Un borrador lleva de 1 a ${MAX_CAROUSEL} fotos`)
  }
  const now = Date.now()
  const draft: Draft = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    photoIds,
    coverUri,
    caption: '',
    ratio: '4:5',
    published: false,
    createdAt: now,
    updatedAt: now,
  }
  writeAll([...readAll(), draft])
  return draft
}

export function updateDraft(
  id: string,
  patch: Partial<Pick<Draft, 'caption' | 'ratio' | 'published'>>,
): void {
  writeAll(
    readAll().map(d => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)),
  )
}

export function deleteDraft(id: string): void {
  writeAll(readAll().filter(d => d.id !== id))
}

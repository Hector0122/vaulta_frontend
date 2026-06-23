import AsyncStorage from '@react-native-async-storage/async-storage'
import { BASE_URL } from './server'
import { fetchWithTimeout } from './fetchWithTimeout'

const PRESIGN_EXPIRY = 604800

const TOKEN_KEY = '@vaulta_token'
const REFRESH_TOKEN_KEY = '@vaulta_refresh_token'

let _onUnauthorized: (() => void) | null = null
let _tokenCache: string | null | undefined
let _refreshTokenCache: string | null | undefined

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb
}

export function clearOnUnauthorized() {
  _onUnauthorized = null
}

export async function getToken(): Promise<string | null> {
  if (_tokenCache !== undefined) return _tokenCache
  try {
    _tokenCache = await AsyncStorage.getItem(TOKEN_KEY)
    return _tokenCache
  } catch {
    return null
  }
}

export async function setToken(token: string): Promise<void> {
  _tokenCache = token
  await AsyncStorage.setItem(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
  _tokenCache = null
  await AsyncStorage.removeItem(TOKEN_KEY)
}

async function getRefreshToken(): Promise<string | null> {
  if (_refreshTokenCache !== undefined) return _refreshTokenCache
  try {
    _refreshTokenCache = await AsyncStorage.getItem(REFRESH_TOKEN_KEY)
    return _refreshTokenCache
  } catch {
    return null
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  _refreshTokenCache = token
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export async function clearRefreshToken(): Promise<void> {
  _refreshTokenCache = null
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY)
}

let _refreshing: Promise<boolean> | null = null

export async function refreshAccessToken(): Promise<boolean> {
  if (_refreshing) return _refreshing
  _refreshing = (async () => {
    try {
      const rt = await getRefreshToken()
      if (!rt) return false
      const res = await fetchWithTimeout(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
      if (!res.ok) return false
      const data = await res.json()
      await setToken(data.token)
      if (data.refreshToken) await setRefreshToken(data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      _refreshing = null
    }
  })()
  return _refreshing
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse(res: Response): Promise<void> {
  if (res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) throw new Error('__RETRY__')
    await clearToken()
    await clearRefreshToken()
    _onUnauthorized?.()
    throw new Error('Sesión expirada')
  }
  if (!res.ok) throw new Error(`Error: ${res.status}`)
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  await handleResponse(res)
  return res.json()
}

async function autoRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i <= 1; i++) {
    try {
      return await fn()
    } catch (e: any) {
      if (e?.message === '__RETRY__' && i < 1) continue
      throw e
    }
  }
  throw new Error('Unexpected')
}

export async function authenticatedGet<T>(endpoint: string): Promise<T> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/${endpoint}`, { headers })
    return handleJsonResponse<T>(res)
  })
}

export async function authenticatedDelete<T = void>(endpoint: string, body?: any): Promise<T> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/${endpoint}`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return body ? handleJsonResponse<T>(res) : (handleResponse(res), undefined as T)
  })
}

export async function authenticatedPost<T>(endpoint: string, body?: any): Promise<T> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleJsonResponse<T>(res)
  })
}

export async function authenticatedPatch<T>(endpoint: string, body: any): Promise<T> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/${endpoint}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return handleJsonResponse<T>(res)
  })
}

export interface FetchPhotosOptions {
  pageToken?: string
  maxKeys?: number
  query?: string
  favoritesOnly?: boolean
  privateOnly?: boolean
  dateFrom?: string
  dateTo?: string
  person?: string
}

export async function fetchPhotosPage(options: FetchPhotosOptions = {}) {
  const { pageToken, maxKeys = 50, query, favoritesOnly, privateOnly, dateFrom, dateTo, person } = options
  return autoRetry(async () => {
    let url = `${BASE_URL}/photos?maxKeys=${maxKeys}`
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`
    if (query) url += `&q=${encodeURIComponent(query)}`
    if (favoritesOnly) url += `&favorites=true`
    if (privateOnly) url += `&private=true`
    if (dateFrom) url += `&dateFrom=${encodeURIComponent(dateFrom)}`
    if (dateTo) url += `&dateTo=${encodeURIComponent(dateTo)}`
    if (person) url += `&person=${encodeURIComponent(person)}`
    const headers = await authHeaders()
    const res = await fetchWithTimeout(url, { headers })
    return handleJsonResponse<{ photos: { uri: string; date: string; id: string; favorite: boolean; tags: string[]; blurred: boolean; private: boolean; mimeType: string }[]; nextToken: string | null }>(res)
  })
}

export async function getPhotoUrl(photoId: string): Promise<string> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/photos/${photoId}`, { headers })
    const data = await handleJsonResponse<{ url: string }>(res)
    return data.url
  })
}

export async function getPhotoDetail(photoId: string): Promise<{ url: string; albums: { id: string; name: string; vault: boolean }[] }> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/photos/${photoId}/detail`, { headers })
    return handleJsonResponse<{ url: string; albums: { id: string; name: string; vault: boolean }[] }>(res)
  })
}

export async function deletePhoto(photoId: string): Promise<void> {
  await authenticatedDelete(`photos/${photoId}`)
}

export async function bulkDeletePhotos(ids: string[]): Promise<{ deleted: number }> {
  return authenticatedDelete<{ deleted: number }>('photos/bulk', { ids })
}

export async function getShareLink(photoId: string, expiresIn: number = PRESIGN_EXPIRY): Promise<string> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/photos/${photoId}/share?expiresIn=${expiresIn}`, { headers })
    const data = await handleJsonResponse<{ url: string }>(res)
    return data.url
  })
}

export async function toggleFavorite(photoId: string): Promise<boolean> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/photos/${photoId}/favorite`, { method: 'PATCH', headers })
    const data = await handleJsonResponse<{ favorite: boolean }>(res)
    return data.favorite
  })
}

export async function addTag(photoId: string, tag: string): Promise<string[]> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/photos/${photoId}/tags`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    })
    const data = await handleJsonResponse<{ tags: string[] }>(res)
    return data.tags
  })
}

export async function addPhotosToAlbum(albumId: string, photoIds: string[]): Promise<{ added: number; alreadyInAlbum: number }> {
  return authenticatedPost(`albums/${albumId}/photos`, { photoIds })
}

export async function removePhotosFromAlbum(albumId: string, photoIds: string[]): Promise<{ removed: number }> {
  return authenticatedDelete(`albums/${albumId}/photos`, { photoIds })
}

export async function updateAlbum(albumId: string, body: { name?: string; coverPhotoId?: string | null }): Promise<any> {
  return authenticatedPatch(`albums/${albumId}`, body)
}

export async function exportAllPhotos(): Promise<{ exportId: string }> {
  return authenticatedPost('photos/export', {})
}

export async function exportAlbum(albumId: string): Promise<{ exportId: string }> {
  return authenticatedPost(`albums/${albumId}/export`, {})
}

export async function exportByDate(dateFrom: string, dateTo: string): Promise<{ exportId: string }> {
  return authenticatedPost('photos/export-by-date', { dateFrom, dateTo })
}

export interface ExportProgress {
  status: 'pending' | 'processing' | 'done' | 'error'
  total: number
  completed: number
  message: string
  label: string
}

export async function getExportStatus(exportId: string): Promise<ExportProgress> {
  return authenticatedGet(`exports/${exportId}`)
}

export async function getTrash(): Promise<{ id: string; uri: string; filename: string; deletedAt: string; size: number }[]> {
  return authenticatedGet('photos/trash')
}

export async function restorePhoto(photoId: string): Promise<void> {
  await authenticatedPost(`photos/${photoId}/restore`, {})
}

export async function permanentlyDeletePhoto(photoId: string): Promise<void> {
  await authenticatedDelete(`photos/trash/${photoId}`)
}

export async function emptyTrash(): Promise<{ deleted: number }> {
  return authenticatedDelete<{ deleted: number }>('photos/trash', {})
}

export async function getPhotoAlbums(photoId: string): Promise<{ id: string; name: string; vault: boolean }[]> {
  return authenticatedGet(`photos/${photoId}/albums`)
}

export async function togglePrivate(photoId: string): Promise<{ private: boolean }> {
  return authenticatedPatch(`photos/${photoId}/private`, {})
}

export async function bulkSetPrivate(ids: string[]): Promise<{ marked: number; skipped: number }> {
  return authenticatedPatch('photos/bulk-private', { ids })
}

export async function fetchVault(): Promise<{
  mainVault: { id: string; name: string; photos: { uri: string; id: string; createdAt: string; private: boolean }[]; _count: { photos: number } }
  vaultAlbums: { id: string; name: string; _count: { photos: number }; createdAt: string; coverUri: string | null }[]
}> {
  return authenticatedGet('albums/vault')
}

export async function createAlbum(name: string, vault?: boolean): Promise<{ id: string; name: string }> {
  return authenticatedPost('albums', { name, vault })
}

export async function migrateVault(): Promise<{ moved: number }> {
  return authenticatedPost('photos/migrate-vault', {})
}

export async function removeTag(photoId: string, tag: string): Promise<string[]> {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}/photos/${photoId}/tags`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    })
    const data = await handleJsonResponse<{ tags: string[] }>(res)
    return data.tags
  })
}

export function fetchPhotosPageRaw(url: string) {
  return autoRetry(async () => {
    const headers = await authHeaders()
    const res = await fetchWithTimeout(`${BASE_URL}${url}`, { headers })
    return handleJsonResponse<{ photos: { uri: string; date: string; id: string; favorite: boolean; tags: string[]; blurred: boolean; private: boolean; mimeType: string }[]; nextToken: string | null }>(res)
  })
}

export type Person = {
  name: string
  faceCount: number
  photoCount: number
  thumbnailPhotoId: string | null
  thumbnailUri: string | null
}

export async function getPeople(): Promise<Person[]> {
  return authenticatedGet('faces/people')
}

export type UnconfirmedFace = {
  id: string
  photoId: string
  photoUri: string | null
}

export async function getUnconfirmedFaces(): Promise<UnconfirmedFace[]> {
  return authenticatedGet('faces/unconfirmed')
}

export async function updateFace(faceId: string, data: { personName?: string; confirmed?: boolean; ignored?: boolean }): Promise<any> {
  return authenticatedPatch(`faces/${faceId}`, data)
}

export async function deleteFace(faceId: string): Promise<void> {
  await authenticatedDelete(`faces/${faceId}`)
}

export async function detectFaces(photoId: string): Promise<{ facesFound: number }> {
  return authenticatedPost(`faces/detect/${photoId}`, {})
}

export async function detectBatchFaces(photoIds: string[]): Promise<{ processed: number; facesFound: number; failed: number }> {
  return authenticatedPost('faces/detect-batch', { photoIds })
}

export async function detectAllFaces(): Promise<{ processed: number; facesFound: number; failed: number }> {
  return authenticatedPost('faces/detect-all', {})
}

export async function confirmAllForPerson(personName: string): Promise<{ confirmed: number }> {
  return authenticatedPost('faces/confirm-all', { personName })
}

export async function mergePeople(fromPerson: string, toPerson: string): Promise<{ merged: number }> {
  return authenticatedPost('faces/merge', { fromPerson, toPerson })
}

export async function getFaceStats(): Promise<{ totalFaces: number; peopleCount: number; byPerson: { name: string; faceCount: number; photoCount: number }[] }> {
  return authenticatedGet('faces/stats')
}

export async function getThisDayByPerson(person: string) {
  return authenticatedGet(`faces/this-day?person=${encodeURIComponent(person)}`)
}

export async function findMoreFaces(person: string): Promise<{ faceId: string; photoId: string; photoUri: string; distance: number }[]> {
  return authenticatedGet(`faces/find-more?person=${encodeURIComponent(person)}`)
}

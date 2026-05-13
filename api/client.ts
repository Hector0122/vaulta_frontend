import AsyncStorage from '@react-native-async-storage/async-storage'
import { BASE_URL } from './server'

const TOKEN_KEY = '@mymega_token'

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY)
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function authenticatedGet<T>(endpoint: string): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/${endpoint}`, { headers })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  return res.json()
}

export async function authenticatedDelete(endpoint: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/${endpoint}`, { method: 'DELETE', headers })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
}

export async function fetchPhotosPage(pageToken?: string, maxKeys: number = 50, query?: string, favoritesOnly?: boolean) {
  let url = `${BASE_URL}/photos?maxKeys=${maxKeys}`
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`
  if (query) url += `&q=${encodeURIComponent(query)}`
  if (favoritesOnly) url += `&favorites=true`
  const headers = await authHeaders()
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  return res.json() as Promise<{ photos: { uri: string; date: string; id: string; favorite: boolean; tags: string[] }[]; nextToken: string | null }>
}

export async function getPhotoUrl(photoId: string): Promise<string> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/photos/${photoId}`, { headers })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const data = await res.json() as { url: string }
  return data.url
}

export async function deletePhoto(photoId: string): Promise<void> {
  await authenticatedDelete(`photos/${photoId}`)
}

export async function getShareLink(photoId: string, expiresIn: number = 604800): Promise<string> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/photos/${photoId}/share?expiresIn=${expiresIn}`, { headers })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const data = await res.json() as { url: string }
  return data.url
}

export async function toggleFavorite(photoId: string): Promise<boolean> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/photos/${photoId}/favorite`, { method: 'PATCH', headers })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const data = await res.json() as { favorite: boolean }
  return data.favorite
}

export async function addTag(photoId: string, tag: string): Promise<string[]> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/photos/${photoId}/tags`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
  })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const data = await res.json() as { tags: string[] }
  return data.tags
}

export async function removeTag(photoId: string, tag: string): Promise<string[]> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/photos/${photoId}/tags`, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
  })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const data = await res.json() as { tags: string[] }
  return data.tags
}

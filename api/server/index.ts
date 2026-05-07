import Config from 'react-native-config';

export const BASE_URL = `${Config.BASE_URL || 'http://localhost'}:${Config.PORT || 3000}`;

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${endpoint}`);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
}

export async function fetchPhotosPage(pageToken?: string, maxKeys: number = 50): Promise<{ photos: { uri: string; date: string }[]; nextToken: string | null }> {
  let url = `${BASE_URL}/photos?maxKeys=${maxKeys}`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
}

export async function apiDelete(endpoint: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${endpoint}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Error: ${res.status}`);
}

export async function getPhotoUrl(filename: string): Promise<string> {
  const data = await apiGet<{ url: string }>(`photos/${filename}`);
  return data.url;
}

export async function deletePhoto(filename: string): Promise<void> {
  await apiDelete(`photos/${filename}`);
}
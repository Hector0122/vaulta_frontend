const BASE_URL = "http://localhost:3000";

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${endpoint}`);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
}
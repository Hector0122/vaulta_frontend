import Config from "react-native-config";

const BASE_URL = `${Config.BASE_URL}:${Config.PORT}`;

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${endpoint}`);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
}
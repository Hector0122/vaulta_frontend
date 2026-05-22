const REQUEST_TIMEOUT = 15000

export function fetchWithTimeout(url: string, options: RequestInit = {}, timeout?: number): Promise<Response> {
  const controller = new AbortController()
  const ms = timeout ?? REQUEST_TIMEOUT
  const id = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id))
}

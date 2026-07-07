const REQUEST_TIMEOUT = 15000

export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout?: number,
): Promise<Response> {
  const controller = new AbortController()
  const ms = timeout ?? REQUEST_TIMEOUT
  const id = setTimeout(() => controller.abort(), ms)

  // Merge external signal with internal timeout controller
  const externalSignal = options.signal
  if (externalSignal) {
    const onAbort = () => controller.abort()
    externalSignal.addEventListener('abort', onAbort)
    if (externalSignal.aborted) {
      controller.abort()
    }
  }

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(id)
    if (externalSignal) {
      externalSignal.removeEventListener('abort', () => controller.abort())
    }
  })
}

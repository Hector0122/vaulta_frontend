export function isPresignedUrl(url: string): boolean {
  try {
    const lower = url.toLowerCase()
    return (
      lower.includes('x-amz-signature') ||
      lower.includes('x-goog-signature') ||
      lower.includes('x-ms-blob-type') ||
      lower.includes('sig=') ||
      lower.includes('signature=') ||
      lower.includes('Expires=') ||
      lower.includes('expires=')
    )
  } catch {
    return false
  }
}

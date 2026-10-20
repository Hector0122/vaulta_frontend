import { NativeModules, Platform } from 'react-native'

const { WidgetModule } = NativeModules

const WIDGET_ENABLED = Platform.OS === 'android'

export function pruneWidgetPhotos(): void {
  if (!WIDGET_ENABLED) return
  try {
    WidgetModule.pruneWidgetPhotos()
  } catch {}
}

export async function addPhotoToWidget(
  photoId: string,
  photoUrl: string,
  fullUrl?: string,
): Promise<void> {
  if (!WIDGET_ENABLED) return
  WidgetModule.addWidgetPhoto(photoId, fullUrl || photoUrl)
}

export async function addPhotosToWidget(
  photos: { id: string; uri: string; fullUri?: string }[],
): Promise<number> {
  if (!WIDGET_ENABLED) return 0
  const existing = await getWidgetPhotoIds()
  const toAdd = photos.filter(p => !existing.includes(p.id))
  for (const p of toAdd) {
    WidgetModule.addWidgetPhoto(p.id, p.fullUri || p.uri)
  }
  return toAdd.length
}

export async function removePhotoFromWidget(photoId: string): Promise<void> {
  if (!WIDGET_ENABLED) return
  WidgetModule.removeWidgetPhoto(photoId)
}

export async function getWidgetPhotoIds(): Promise<string[]> {
  if (!WIDGET_ENABLED) return []

  return new Promise((resolve) => {
    try {
      WidgetModule.getWidgetPhotoIds((json: string) => {
        try {
          resolve(JSON.parse(json))
        } catch {
          resolve([])
        }
      })
    } catch {
      resolve([])
    }
  })
}


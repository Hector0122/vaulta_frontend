import { NativeModules, Platform } from 'react-native'
import { fetchPhotosPage } from './client'

const { WidgetModule } = NativeModules

const WIDGET_ENABLED = Platform.OS === 'android'

export async function updateWidgetWithRecentPhotos(): Promise<void> {
  if (!WIDGET_ENABLED) return

  try {
    const data = await fetchPhotosPage(undefined, 4)
    WidgetModule.updateWidget(data.photos ? data.photos.length : 0, [])
  } catch {
    // Silently fail — widget keeps previous state
  }
}

export async function addPhotoToWidget(photoId: string, photoUrl: string): Promise<void> {
  if (!WIDGET_ENABLED) return
  WidgetModule.addWidgetPhoto(photoId, photoUrl)
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

export function clearWidget(): void {
  if (!WIDGET_ENABLED) return
  try {
    WidgetModule.clearWidget()
  } catch {}
}

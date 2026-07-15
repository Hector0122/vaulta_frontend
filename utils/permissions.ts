import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native'

export async function requestSaveToGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true

  const version = Platform.Version as number

  if (version >= 33) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
    ])
    return (
      results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === 'granted' &&
      results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === 'granted'
    )
  }

  if (version >= 29) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    )
    return result === 'granted'
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  )
  return result === 'granted'
}

export function promptOpenSettings() {
  Alert.alert(
    'Permiso requerido',
    'Necesitamos acceso al almacenamiento para guardar las fotos. Abre la configuración para conceder el permiso.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
    ],
  )
}

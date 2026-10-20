import { Alert, Linking } from 'react-native'
import Config from 'react-native-config'

const LATEST_RELEASE =
  'https://api.github.com/repos/Hector0122/vaulta_frontend/releases/latest'

export async function checkForUpdate(): Promise<void> {
  if (!Config.APP_VERSION) return
  try {
    const res = await fetch(LATEST_RELEASE)
    if (!res.ok) return
    const release = await res.json()
    const apk = release.assets?.find((a: { name: string }) => a.name.endsWith('.apk'))
    if (!apk || release.tag_name === `v${Config.APP_VERSION}`) return
    Alert.alert(
      'Nueva versión disponible',
      `${release.tag_name} está lista para instalar.`,
      [
        { text: 'Después', style: 'cancel' },
        { text: 'Actualizar', onPress: () => Linking.openURL(apk.browser_download_url) },
      ],
    )
  } catch {}
}

import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics'

const rnBiometrics = new ReactNativeBiometrics()

const BIOMETRY_LABELS: Record<string, string> = {
  [BiometryTypes.TouchID]: 'Touch ID',
  [BiometryTypes.FaceID]: 'Face ID',
  [BiometryTypes.Biometrics]: 'huella digital',
}

export async function isBiometricsAvailable(): Promise<{
  available: boolean
  biometryLabel: string
}> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable()
    const label = biometryType
      ? BIOMETRY_LABELS[biometryType] || 'biometría'
      : 'biometría'
    return { available: !!available, biometryLabel: label }
  } catch {
    return { available: false, biometryLabel: 'biometría' }
  }
}

export async function promptBiometrics(
  promptMessage: string,
): Promise<boolean> {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancelar',
      fallbackPromptMessage: 'Usar código de acceso',
    })
    return success
  } catch {
    return false
  }
}

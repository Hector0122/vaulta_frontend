import { Vibration } from 'react-native'

let triggerHaptic: ((type: string, opts: object) => void) | null = null

try {
  const haptics = require('react-native-haptic-feedback')
  if (haptics && typeof haptics.trigger === 'function') {
    triggerHaptic = haptics.trigger
  }
} catch {}

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
}

export function impactLight() {
  if (triggerHaptic) triggerHaptic('impactLight', options)
  else Vibration.vibrate(30)
}

export function impactMedium() {
  if (triggerHaptic) triggerHaptic('impactMedium', options)
  else Vibration.vibrate(50)
}

export function impactHeavy() {
  if (triggerHaptic) triggerHaptic('impactHeavy', options)
  else Vibration.vibrate(80)
}

export function selection() {
  if (triggerHaptic) triggerHaptic('selection', options)
  else Vibration.vibrate(30)
}

export function success() {
  if (triggerHaptic) triggerHaptic('notificationSuccess', options)
  else Vibration.vibrate(40)
}

export function warning() {
  if (triggerHaptic) triggerHaptic('notificationWarning', options)
  else Vibration.vibrate(60)
}

export function error() {
  if (triggerHaptic) triggerHaptic('notificationError', options)
  else Vibration.vibrate(100)
}

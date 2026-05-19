import { getApp } from '@react-native-firebase/app'
import { getMessaging, getToken, onMessage, requestPermission, AuthorizationStatus } from '@react-native-firebase/messaging'
import type { RemoteMessage } from '@react-native-firebase/messaging'
import { authenticatedPost } from './client'

const messaging = getMessaging(getApp())

export async function requestNotificationPermission(): Promise<boolean> {
  const authStatus = await requestPermission(messaging)
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  return enabled
}

export async function getFcmToken(): Promise<string | null> {
  try {
    return await getToken(messaging)
  } catch {
    return null
  }
}

export async function registerFcmToken(): Promise<void> {
  const enabled = await requestNotificationPermission()
  if (!enabled) return

  const token = await getFcmToken()
  if (!token) return

  try {
    await authenticatedPost('device-token', { token })
  } catch { console.warn('[Notifications] Token registration failed') }
}

export function onMessageForeground(
  handler: (message: RemoteMessage) => void,
) {
  return onMessage(messaging, handler)
}

export function onNotificationOpenedApp(
  handler: (message: RemoteMessage) => void,
) {
  const { onNotificationOpenedApp } = require('@react-native-firebase/messaging')
  return onNotificationOpenedApp(messaging, handler)
}

export async function getInitialNotification(): Promise<RemoteMessage | null> {
  const { getInitialNotification } = require('@react-native-firebase/messaging')
  return getInitialNotification(messaging)
}

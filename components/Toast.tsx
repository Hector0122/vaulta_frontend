import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

type ToastType = 'success' | 'error' | 'info'

type ToastPosition = 'top' | 'top-right' | 'bottom'

type Props = {
  visible: boolean
  message: string
  type?: ToastType
  position?: ToastPosition
  onDismiss: () => void
  duration?: number
}

const icons: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'information',
}

export default function Toast({
  visible,
  message,
  type = 'info',
  position = 'top',
  onDismiss,
  duration = 2500,
}: Props) {
  const { colors } = useTheme()
  const { top: topInset } = useSafeAreaInsets()
  const animValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      animValue.setValue(0)
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 10,
      }).start()

      const timer = setTimeout(() => {
        Animated.timing(animValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onDismiss())
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible, animValue, duration, onDismiss])

  if (!visible) return null

  const bgColor =
    type === 'success'
      ? colors.success
      : type === 'error'
      ? colors.danger
      : colors.primary

  const isTop = position === 'top' || position === 'top-right'
  const isRight = position === 'top-right'

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: isTop ? [-80, 0] : [80, 0],
  })

  const opacity = animValue

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.banner,
          isRight
            ? styles.bannerRight
            : isTop
            ? styles.bannerTop
            : styles.bannerBottom,
          isTop && { top: topInset + 12 },
          isRight && { top: topInset + 12 },
          { backgroundColor: bgColor, transform: [{ translateY }], opacity },
        ]}
      >
        <Icon name={icons[type]} size={20} color="#fff" />
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 9999,
  },
  bannerTop: {
    top: 60,
    left: 16,
    right: 16,
  },
  bannerRight: {
    top: 60,
    right: 16,
    maxWidth: 280,
  },
  bannerBottom: {
    bottom: 100,
    left: 16,
    right: 16,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
})

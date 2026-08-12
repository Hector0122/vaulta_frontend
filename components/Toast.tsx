import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { motion, radius, iconSize } from '../tokens'

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
  const progress = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      progress.value = 0
      progress.value = withSpring(1, motion.spring.gentle)

      const timer = setTimeout(() => {
        progress.value = withTiming(0, { duration: motion.duration.fast }, (finished) => {
          if (finished) runOnJS(onDismiss)()
        })
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible, progress, duration, onDismiss])

  const isTop = position === 'top' || position === 'top-right'
  const isRight = position === 'top-right'

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], isTop ? [-80, 0] : [80, 0]) },
    ],
    opacity: progress.value,
  }))

  if (!visible) return null

  const bgColor =
    type === 'success'
      ? colors.success
      : type === 'error'
      ? colors.danger
      : colors.primary

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
          { backgroundColor: bgColor },
          animatedStyle,
        ]}
      >
        <Icon name={icons[type]} size={iconSize.md} color="#fff" />
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
    borderRadius: radius.md,
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

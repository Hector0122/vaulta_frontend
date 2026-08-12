import React, { useEffect } from 'react'
import { TouchableOpacity, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
} from 'react-native-reanimated'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { ThemeColors } from '../theme'
import { motion, iconSize } from '../tokens'

type Props = {
  visible: boolean
  colors: ThemeColors
  onClose: () => void
  onOpenGallery: () => void
  onOpenCamera: () => void
  onOpenVideo: () => void
  onToggle: () => void
}

export default function FABMenu({
  visible,
  colors,
  onClose,
  onOpenGallery,
  onOpenCamera,
  onOpenVideo,
  onToggle,
}: Props) {
  const anim1 = useSharedValue(0)
  const anim2 = useSharedValue(0)
  const anim3 = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      anim1.value = withSpring(1, motion.spring.gentle)
      anim2.value = withDelay(50, withSpring(1, motion.spring.gentle))
      anim3.value = withDelay(100, withSpring(1, motion.spring.gentle))
    } else {
      anim1.value = withTiming(0, { duration: motion.duration.instant })
      anim2.value = withTiming(0, { duration: motion.duration.instant })
      anim3.value = withTiming(0, { duration: motion.duration.instant })
    }
  }, [visible, anim1, anim2, anim3])

  const style1 = useAnimatedStyle(() => ({
    opacity: anim1.value,
    transform: [
      { translateY: interpolate(anim1.value, [0, 1], [20, 0]) },
      { scale: interpolate(anim1.value, [0, 1], [0.3, 1]) },
    ],
  }))
  const style2 = useAnimatedStyle(() => ({
    opacity: anim2.value,
    transform: [
      { translateY: interpolate(anim2.value, [0, 1], [20, 0]) },
      { scale: interpolate(anim2.value, [0, 1], [0.3, 1]) },
    ],
  }))
  const style3 = useAnimatedStyle(() => ({
    opacity: anim3.value,
    transform: [
      { translateY: interpolate(anim3.value, [0, 1], [20, 0]) },
      { scale: interpolate(anim3.value, [0, 1], [0.3, 1]) },
    ],
  }))

  return (
    <>
      {visible && (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      )}
      <Animated.View
        style={[styles.mini, styles.mini1, { backgroundColor: colors.surfaceAlt }, style1]}
      >
        <TouchableOpacity style={styles.miniInner} onPress={onOpenGallery}>
          <Icon name="image-multiple-outline" size={iconSize.md} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        style={[styles.mini, styles.mini2, { backgroundColor: colors.surfaceAlt }, style2]}
      >
        <TouchableOpacity style={styles.miniInner} onPress={onOpenCamera}>
          <Icon name="camera" size={iconSize.md} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        style={[styles.mini, styles.mini3, { backgroundColor: colors.surfaceAlt }, style3]}
      >
        <TouchableOpacity style={styles.miniInner} onPress={onOpenVideo}>
          <Icon name="video-outline" size={iconSize.md} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={onToggle}
      >
        <Icon name={visible ? 'close' : 'camera-plus-outline'} size={iconSize.lg} color="#fff" />
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mini: {
    position: 'absolute',
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  mini1: { bottom: 100 },
  mini2: { bottom: 160 },
  mini3: { bottom: 220 },
  miniInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

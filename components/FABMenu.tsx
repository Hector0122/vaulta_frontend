import React, { useEffect, useRef } from 'react'
import { TouchableOpacity, Animated, Pressable, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

type Props = {
  visible: boolean
  colors: any
  onClose: () => void
  onOpenGallery: () => void
  onOpenCamera: () => void
  onOpenVideo: () => void
  onToggle: () => void
}

export default function FABMenu({ visible, colors, onClose, onOpenGallery, onOpenCamera, onOpenVideo, onToggle }: Props) {
  const anim1 = useRef(new Animated.Value(0)).current
  const anim2 = useRef(new Animated.Value(0)).current
  const anim3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(anim1, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.spring(anim2, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true, delay: 50 }),
        Animated.spring(anim3, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true, delay: 100 }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(anim1, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(anim2, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(anim3, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]).start()
    }
  }, [visible, anim1, anim2, anim3])

  return (
    <>
      {visible && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />}
      <Animated.View style={[
        styles.mini, { backgroundColor: colors.surfaceAlt, right: 24, bottom: 100,
          opacity: anim1,
          transform: [
            { translateY: anim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            { scale: anim1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
          ],
        },
      ]}>
        <TouchableOpacity style={styles.miniInner} onPress={onOpenGallery}>
          <Icon name="photo-library" size={22} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[
        styles.mini, { backgroundColor: colors.surfaceAlt, right: 24, bottom: 160,
          opacity: anim2,
          transform: [
            { translateY: anim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            { scale: anim2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
          ],
        },
      ]}>
        <TouchableOpacity style={styles.miniInner} onPress={onOpenCamera}>
          <Icon name="camera-alt" size={22} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[
        styles.mini, { backgroundColor: colors.surfaceAlt, right: 24, bottom: 220,
          opacity: anim3,
          transform: [
            { translateY: anim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            { scale: anim3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
          ],
        },
      ]}>
        <TouchableOpacity style={styles.miniInner} onPress={onOpenVideo}>
          <Icon name="videocam" size={22} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={onToggle}>
        <Icon name={visible ? 'close' : 'add-a-photo'} size={28} color="#fff" />
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  mini: {
    position: 'absolute', width: 48, height: 48, borderRadius: 24,
    elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 3,
  },
  miniInner: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
})

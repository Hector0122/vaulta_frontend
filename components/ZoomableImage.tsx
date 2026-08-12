import React, { useState } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { motion } from '../tokens'

type Props = {
  uri: string
}

export default function ZoomableImage({ uri }: Props) {
  const { width, height } = useWindowDimensions()
  const scale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  const baseScale = useSharedValue(1)
  const baseTranslateX = useSharedValue(0)
  const baseTranslateY = useSharedValue(0)

  const [isZoomed, setIsZoomed] = useState(false)

  // Reemplaza al viejo `scale.addListener` de Animated (no existe en
  // shared values) — corre en el hilo de UI y sincroniza `isZoomed` (JS) para
  // habilitar/deshabilitar el pan.
  useAnimatedReaction(
    () => scale.value > 1.05,
    (zoomed, prevZoomed) => {
      if (zoomed !== prevZoomed) {
        runOnJS(setIsZoomed)(zoomed)
      }
    },
  )

  const clamp = (value: number, min: number, max: number) => {
    'worklet'
    return Math.min(Math.max(value, min), max)
  }

  const getBounds = (s: number) => {
    'worklet'
    const scaledWidth = width * s
    const scaledHeight = height * s
    const maxX = Math.max(0, (scaledWidth - width) / 2)
    const maxY = Math.max(0, (scaledHeight - height) / 2)
    return { maxX, maxY }
  }

  const resetZoom = () => {
    'worklet'
    scale.value = withSpring(1, motion.spring.gentle)
    translateX.value = withSpring(0, motion.spring.gentle)
    translateY.value = withSpring(0, motion.spring.gentle)
    baseScale.value = 1
    baseTranslateX.value = 0
    baseTranslateY.value = 0
  }

  const pinch = Gesture.Pinch()
    .onStart(() => {
      baseScale.value = scale.value
    })
    .onUpdate(e => {
      scale.value = Math.max(1, Math.min(baseScale.value * e.scale, 5))
    })
    .onEnd(() => {
      if (scale.value < 1) {
        resetZoom()
      }
    })

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (scale.value > 1.05) {
        resetZoom()
      } else {
        scale.value = withSpring(2.5, motion.spring.gentle)
        baseScale.value = 2.5
      }
    })

  const pan = Gesture.Pan()
    .enabled(isZoomed)
    .minPointers(1)
    .onStart(() => {
      baseTranslateX.value = translateX.value
      baseTranslateY.value = translateY.value
    })
    .onUpdate(e => {
      if (scale.value <= 1.05) return
      const { maxX, maxY } = getBounds(scale.value)
      translateX.value = clamp(baseTranslateX.value + e.translationX, -maxX, maxX)
      translateY.value = clamp(baseTranslateY.value + e.translationY, -maxY, maxY)
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        resetZoom()
        return
      }
      const { maxX, maxY } = getBounds(scale.value)
      if (Math.abs(translateX.value) > maxX) {
        translateX.value = withSpring(clamp(translateX.value, -maxX, maxX), motion.spring.gentle)
      }
      if (Math.abs(translateY.value) > maxY) {
        translateY.value = withSpring(clamp(translateY.value, -maxY, maxY), motion.spring.gentle)
      }
    })

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <NitroImage
          image={{ url: uri }}
          style={{ width, height }}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})

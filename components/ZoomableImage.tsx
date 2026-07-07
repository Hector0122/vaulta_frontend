import React, { useRef, useCallback } from 'react'
import { Animated, StyleSheet, useWindowDimensions } from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

type Props = {
  uri: string
}

export default function ZoomableImage({ uri }: Props) {
  const { width, height } = useWindowDimensions()
  const scale = useRef(new Animated.Value(1)).current
  const translateX = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(0)).current

  const baseScale = useRef(1)
  const baseTranslateX = useRef(0)
  const baseTranslateY = useRef(0)

  const clamp = useCallback(
    (value: number, min: number, max: number) => {
      return Math.min(Math.max(value, min), max)
    },
    [],
  )

  const getBounds = useCallback(
    (s: number) => {
      const scaledWidth = width * s
      const scaledHeight = height * s
      const maxX = Math.max(0, (scaledWidth - width) / 2)
      const maxY = Math.max(0, (scaledHeight - height) / 2)
      return { maxX, maxY }
    },
    [width, height],
  )

  const resetZoom = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start()
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start()
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start()
    baseScale.current = 1
    baseTranslateX.current = 0
    baseTranslateY.current = 0
  }, [scale, translateX, translateY])

  const pinch = Gesture.Pinch()
    .onStart(() => {
      baseScale.current = (scale as any).__getValue()
    })
    .onUpdate(e => {
      const newScale = Math.max(1, Math.min(baseScale.current * e.scale, 5))
      ;(scale as any).setValue(newScale)
    })
    .onEnd(() => {
      const current = (scale as any).__getValue()
      if (current < 1) {
        resetZoom()
      }
    })

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      const current = (scale as any).__getValue()
      if (current > 1.05) {
        resetZoom()
      } else {
        Animated.spring(scale, {
          toValue: 2.5,
          useNativeDriver: true,
          friction: 8,
        }).start()
        baseScale.current = 2.5
      }
    })

  const pan = Gesture.Pan()
    .minPointers(1)
    .onStart(() => {
      baseTranslateX.current = (translateX as any).__getValue()
      baseTranslateY.current = (translateY as any).__getValue()
    })
    .onUpdate(e => {
      const currentScale = (scale as any).__getValue()
      if (currentScale <= 1.05) return

      const { maxX, maxY } = getBounds(currentScale)
      const newX = clamp(
        baseTranslateX.current + e.translationX,
        -maxX,
        maxX,
      )
      const newY = clamp(
        baseTranslateY.current + e.translationY,
        -maxY,
        maxY,
      )
      ;(translateX as any).setValue(newX)
      ;(translateY as any).setValue(newY)
    })
    .onEnd(() => {
      const currentScale = (scale as any).__getValue()
      if (currentScale <= 1.05) {
        resetZoom()
        return
      }
      const { maxX, maxY } = getBounds(currentScale)
      const currentX = (translateX as any).__getValue()
      const currentY = (translateY as any).__getValue()

      if (Math.abs(currentX) > maxX) {
        Animated.spring(translateX, {
          toValue: clamp(currentX, -maxX, maxX),
          useNativeDriver: true,
          friction: 8,
        }).start()
      }
      if (Math.abs(currentY) > maxY) {
        Animated.spring(translateY, {
          toValue: clamp(currentY, -maxY, maxY),
          useNativeDriver: true,
          friction: 8,
        }).start()
      }
    })

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap)

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateX }, { translateY }, { scale }] },
        ]}
      >
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

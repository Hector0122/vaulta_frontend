import React, { useEffect } from 'react'
import { type ViewStyle } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated'
import { motion } from '../tokens'

type Props = {
  children: React.ReactNode
  style?: ViewStyle
  delay?: number
}

export default function FadeInView({ children, style, delay = 0 }: Props) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(10)

  useEffect(() => {
    const config = { duration: motion.duration.base, easing: Easing.bezier(...motion.easing.standard) }
    opacity.value = withDelay(delay, withTiming(1, config))
    translateY.value = withDelay(delay, withTiming(0, config))
  }, [opacity, translateY, delay])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  )
}

import React, { useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { NitroImage } from 'react-native-nitro-image';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

type Props = {
  uri: string;
};

export default function ZoomableImage({ uri }: Props) {
  const { width, height } = useWindowDimensions();
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const baseScale = useRef(1);
  const baseTranslateX = useRef(0);
  const baseTranslateY = useRef(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      baseScale.current = (scale as any).__getValue();
    })
    .onUpdate((e) => {
      const newScale = Math.max(1, Math.min(baseScale.current * e.scale, 5));
      (scale as any).setValue(newScale);
    })
    .onEnd(() => {
      const current = (scale as any).__getValue();
      if (current < 1) {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        baseTranslateX.current = 0;
        baseTranslateY.current = 0;
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      const current = (scale as any).__getValue();
      if (current > 1) {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        baseScale.current = 1;
        baseTranslateX.current = 0;
        baseTranslateY.current = 0;
      } else {
        Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start();
        baseScale.current = 2.5;
      }
    });

  const pan = Gesture.Pan()
    .minPointers(2)
    .onStart(() => {
      baseTranslateX.current = (translateX as any).__getValue();
      baseTranslateY.current = (translateY as any).__getValue();
    })
    .onUpdate((e) => {
      (translateX as any).setValue(baseTranslateX.current + e.translationX);
      (translateY as any).setValue(baseTranslateY.current + e.translationY);
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

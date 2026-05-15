import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme';

export function SkeletonBox({ width, height, style, borderRadius = 6 }: {
  width?: number | string
  height?: number | string
  style?: any
  borderRadius?: number
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity.current, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity.current, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.skeleton, opacity: opacity.current }, style]}
    />
  );
}

export function SkeletonPhotoGrid({ colors, count = 6 }: { colors: any; count?: number }) {
  const { width: screenWidth } = useWindowDimensions();
  const colWidth = (screenWidth - 16 - 6) / 2;
  const rows = Array.from({ length: Math.ceil(count / 2) });

  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 8 }}>
      {[0, 1].map(col => (
        <View key={col} style={{ flex: 1, gap: 6 }}>
          {rows.map((_, i) => (
            <SkeletonBox
              key={`${col}-${i}`}
              width={colWidth}
              height={col === i % 2 ? 200 : 250}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function SkeletonAlbumList({ colors, count = 4 }: { colors: any; count?: number }) {
  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.albumRow, { backgroundColor: colors.cardBg }]}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <SkeletonBox width="60%" height={16} borderRadius={4} />
            <SkeletonBox width="30%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
});

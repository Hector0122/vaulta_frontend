import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme';

export default function ConnectionBanner() {
  const { colors } = useTheme();
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setConnected(state.isConnected ?? true);
    });
    return () => unsub();
  }, []);

  if (connected) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.danger }]}>
      <Icon name="wifi-off" size={16} color="#fff" />
      <Text style={styles.text}>Sin conexión a internet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  text: { color: '#fff', fontSize: 13, marginLeft: 6, fontWeight: '600' },
});

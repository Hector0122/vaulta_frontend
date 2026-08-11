import { useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
} from 'react-native'
import Video from 'react-native-video'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type Props = {
  uri: string
  headers?: Record<string, string>
  posterUri?: string
}

export default function VideoPlayer({ uri, headers, posterUri }: Props) {
  const [paused, setPaused] = useState(true)
  const [showControl, setShowControl] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const ready = !!uri

  const handlePress = () => {
    if (error || !ready) return
    if (!mounted) {
      setMounted(true)
      setPaused(false)
      setShowControl(false)
    } else if (showControl) {
      setPaused(p => !p)
      setShowControl(false)
    } else {
      setShowControl(true)
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Icon name="alert-circle-outline" size={48} color="#fff" />
        <Text style={styles.errorText}>Error al cargar el video</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setError(false)
            setLoading(true)
            setMounted(false)
            setPaused(true)
          }}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.container}
      onPress={handlePress}
    >
      {(!mounted || loading) && posterUri && (
        <Image
          source={{ uri: posterUri }}
          style={styles.poster}
          resizeMode="cover"
        />
      )}
      {mounted && (
        <Video
          source={{ uri, headers }}
          style={styles.video}
          paused={paused}
          resizeMode="contain"
          onLoad={() => {
            setLoading(false)
          }}
          onError={() => {
            setLoading(false)
            setError(true)
          }}
          onBuffer={({ isBuffering }) => setLoading(isBuffering)}
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
          progressUpdateInterval={500}
          repeat
        />
      )}
      {!ready && (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando video…</Text>
        </View>
      )}
      {loading && mounted && ready && (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      {ready && !error && !mounted && (
        <View style={styles.playOverlay} pointerEvents="none">
          <Icon
            name="play-circle"
            size={64}
            color="rgba(255,255,255,0.8)"
          />
        </View>
      )}
      {mounted && showControl && !loading && !error && (
        <View style={styles.playOverlay} pointerEvents="none">
          <Icon
            name={paused ? 'play-circle' : 'pause-circle'}
            size={64}
            color="rgba(255,255,255,0.8)"
          />
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  poster: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: { color: '#fff', fontSize: 16, marginTop: 12 },
  loadingText: { color: '#fff', fontSize: 14, marginTop: 8 },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})

import React, { useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import MapView, { Marker, Callout, Region } from 'react-native-maps'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../../theme'
import { authenticatedGet } from '../../api/client'
import { StackNavigationProp } from '@react-navigation/stack'

type GeoPhoto = {
  id: string
  url: string
  filename: string
  lat: number
  lng: number
}

type MapStackParamList = {
  Main: undefined
  PhotoPreview: {
    photos: { uri: string; id: string }[]
    initialIndex: number
  }
}

const DEFAULT_REGION: Region = {
  latitude: 19.4326,
  longitude: -99.1332,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
}

function computeRegion(photos: GeoPhoto[]): Region {
  if (photos.length === 0) return DEFAULT_REGION
  const lats = photos.map(p => p.lat)
  const lngs = photos.map(p => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latDelta = (maxLat - minLat) * 1.5 || 0.05
  const lngDelta = (maxLng - minLng) * 1.5 || 0.05
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(latDelta, 0.05),
    longitudeDelta: Math.max(lngDelta, 0.05),
  }
}

export default function MapScreen() {
  const navigation = useNavigation<StackNavigationProp<MapStackParamList>>()
  const { colors } = useTheme()
  const [photos, setPhotos] = useState<GeoPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<MapView>(null)
  const fetchRef = useRef(false)

  const fetchPhotos = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchRef.current = true
    authenticatedGet<GeoPhoto[]>('photos/geo')
      .then(data => { if (!cancelled) setPhotos(data) })
      .catch(() => { if (!cancelled) setError('Error al cargar fotos geolocalizadas') })
      .finally(() => { if (!cancelled) { setLoading(false); fetchRef.current = false } })
    return () => { cancelled = true }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (fetchRef.current) return
      return fetchPhotos()
    }, [fetchPhotos]),
  )

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon name="error-outline" size={56} color={colors.textTertiary} />
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={fetchPhotos}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (photos.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon name="map" size={56} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No hay fotos con ubicación</Text>
      </View>
    )
  }

  const region = computeRegion(photos)

  const handleMarkerPress = (photo: GeoPhoto) => {
    navigation.navigate('PhotoPreview', {
      photos: photos.map(p => ({ uri: p.url, id: p.id })),
      initialIndex: photos.findIndex(p => p.id === photo.id),
    })
  }

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={region}>
        {photos.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.filename}
            onCalloutPress={() => handleMarkerPress(p)}
          >
            <Callout>
              <TouchableOpacity onPress={() => handleMarkerPress(p)}>
                <Text style={styles.calloutTitle}>{p.filename}</Text>
                <Text style={[styles.calloutSub, { color: colors.primary }]}>Ver foto →</Text>
              </TouchableOpacity>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 12 },
  errorText: { fontSize: 16, paddingHorizontal: 32, textAlign: 'center', marginTop: 12 },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  map: { flex: 1 },
  calloutTitle: { fontSize: 14, fontWeight: '600', color: '#222', maxWidth: 200 },
  calloutSub: { fontSize: 12, marginTop: 4 },
})

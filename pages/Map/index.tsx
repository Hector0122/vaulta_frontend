import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { useFocusEffect } from '@react-navigation/native'
import { authenticatedGet } from '../../api/client'

type GeoPhoto = {
  id: string
  url: string
  filename: string
  lat: number
  lng: number
}

export default function MapScreen() {
  const [photos, setPhotos] = useState<GeoPhoto[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      authenticatedGet<GeoPhoto[]>('photos/geo')
        .then(setPhotos)
        .catch(() => {})
        .finally(() => setLoading(false))
    }, []),
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#222" />
      </View>
    )
  }

  if (photos.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No geotagged photos yet</Text>
      </View>
    )
  }

  const region = {
    latitude: photos[0].lat,
    longitude: photos[0].lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region}>
        {photos.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.filename}
          />
        ))}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  map: { flex: 1 },
})

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import type { ThemeColors } from '../../theme'

type Props = {
  error: string | null
  colors: ThemeColors
  rangeStart: string | null
  favoritesOnly: boolean
  searchQuery: string
  loadPhotos: () => void
}

export function HomeEmptyState({
  error,
  colors,
  rangeStart,
  favoritesOnly,
  searchQuery,
  loadPhotos,
}: Props) {
  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Icon
          name="error-outline"
          size={56}
          color={colors.textTertiary}
        />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => loadPhotos()}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View
      style={styles.centerContainer}
    >
      <Icon
        name="photo-library"
        size={72}
        color={colors.textTertiary}
      />
      {rangeStart || favoritesOnly || searchQuery ? (
        <>
          <Text
            style={[styles.stateText, { color: colors.textSecondary }]}
          >
            Sin resultados
          </Text>
          <Text
            style={[styles.stateSubtext, { color: colors.textTertiary }]}
          >
            {searchQuery
              ? `No se encontraron fotos para "${searchQuery}"`
              : 'No hay fotos que coincidan con este filtro'}
          </Text>
        </>
      ) : (
        <>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            No hay fotos aún
          </Text>
          <Text
            style={[styles.stateSubtext, { color: colors.textTertiary }]}
          >
            Sube tu primera foto
          </Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  stateText: { fontSize: 18, marginTop: 16, textAlign: 'center' },
  stateSubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 16 },
})

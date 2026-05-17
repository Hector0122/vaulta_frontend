import React from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

type Recuerdo = {
  year: number
  uri: string
  id: string
  filename: string
  count: number
  yearsAgo: number
  mimeType?: string
}

type Props = {
  recuerdos: Recuerdo[]
  colors: any
  onPressRecuerdo: (r: Recuerdo) => void
}

export default function RecuerdosSection({ recuerdos, colors, onPressRecuerdo }: Props) {
  if (recuerdos.length === 0) return null

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.header}>
        <Icon name="history" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Recuerda...</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {recuerdos.map(r => (
          <TouchableOpacity
            key={`${r.year}-${r.id}`}
            style={styles.card}
            onPress={() => onPressRecuerdo(r)}
          >
            <Image source={{ uri: r.uri }} style={styles.thumb} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Hace {r.yearsAgo} año{r.yearsAgo > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingVertical: 10, paddingLeft: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '600' },
  card: { marginRight: 10, alignItems: 'center', width: 100 },
  thumb: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#e0e0e0' },
  label: { fontSize: 11, marginTop: 4, textAlign: 'center' },
})

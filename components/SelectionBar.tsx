import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

type Props = {
  selectedCount: number
  isDark: boolean
  colors: any
  onDownload: () => void
  onShare: () => void
  onAddToAlbum: () => void
  onDelete: () => void
}

export default function SelectionBar({
  selectedCount,
  isDark,
  colors,
  onDownload,
  onShare,
  onAddToAlbum,
  onDelete,
}: Props) {
  if (selectedCount === 0) return null

  return (
    <View style={[styles.bar, { backgroundColor: isDark ? '#000' : '#222' }]}>
      <TouchableOpacity style={styles.action} onPress={onDownload}>
        <Icon name="download" size={24} color="#fff" />
        <Text style={styles.label}>Descargar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={onShare}>
        <Icon name="share" size={24} color="#fff" />
        <Text style={styles.label}>Compartir</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={onAddToAlbum}>
        <Icon name="photo-album" size={24} color="#4fc3f7" />
        <Text style={styles.label}>Álbum</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={onDelete}>
        <Icon name="delete" size={24} color={colors.danger} />
        <Text style={[styles.label, { color: colors.danger }]}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  action: { alignItems: 'center', padding: 6 },
  label: { color: '#fff', fontSize: 12, marginTop: 4 },
})

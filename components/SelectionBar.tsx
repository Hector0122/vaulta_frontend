import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { ThemeColors } from '../theme'
import { iconSize } from '../tokens'

type Props = {
  selectedCount: number
  isDark: boolean
  colors: ThemeColors
  onDownload: () => void
  onShare: () => void
  onAddToAlbum: () => void
  onAddToWidget: () => void
  onMakePrivate: () => void
  onDelete: () => void
}

export default function SelectionBar({
  selectedCount,
  isDark,
  colors,
  onDownload,
  onShare,
  onAddToAlbum,
  onAddToWidget,
  onMakePrivate,
  onDelete,
}: Props) {
  if (selectedCount === 0) return null

  return (
    <View style={[styles.bar, { backgroundColor: isDark ? '#000' : '#222' }]}>
      <TouchableOpacity style={styles.action} onPress={onDownload}>
        <Icon name="download" size={iconSize.md} color="#fff" />
        <Text style={styles.label}>Descargar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={onShare}>
        <Icon name="share-variant" size={iconSize.md} color="#fff" />
        <Text style={styles.label}>Compartir</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={onAddToAlbum}>
        <Icon name="image-multiple-outline" size={iconSize.md} color="#4fc3f7" />
        <Text style={styles.label}>Álbum</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={onAddToWidget}>
        <Icon name="cellphone" size={iconSize.md} color="#2BD4CE" />
        <Text style={[styles.label, { color: '#2BD4CE' }]}>Widget</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={onMakePrivate}>
        <Icon name="eye-off-outline" size={iconSize.md} color="#ffa726" />
        <Text style={[styles.label, { color: '#ffa726' }]}>Privada</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={onDelete}>
        <Icon name="delete" size={iconSize.md} color={colors.danger} />
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

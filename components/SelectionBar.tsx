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
  onEstudio: () => void
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
  onEstudio,
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
      <TouchableOpacity style={styles.action} onPress={onEstudio}>
        <Icon name="palette-outline" size={iconSize.md} color="#e1306c" />
        <Text style={[styles.label, { color: '#e1306c' }]}>Estudio</Text>
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
    paddingHorizontal: 4,
  },
  // flex: 1 para que los 7 botones quepan en pantallas angostas
  action: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  label: { color: '#fff', fontSize: 11, marginTop: 4 },
})

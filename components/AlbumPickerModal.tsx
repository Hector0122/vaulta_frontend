import React from 'react'
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { ThemeColors } from '../theme'

type Album = { id: string; name: string; _count: { photos: number }; vault?: boolean }

type Props = {
  visible: boolean
  albums: Album[]
  colors: ThemeColors
  onClose: () => void
  onSelectAlbum: (album: Album) => void
}

export default function AlbumPickerModal({
  visible,
  albums,
  colors,
  onClose,
  onSelectAlbum,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Añadir a álbum
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {albums.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No hay álbumes. Crea uno desde la pestaña Álbumes.
              </Text>
            </View>
          ) : (
            <ScrollView>
              {albums.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.row,
                    { borderBottomColor: colors.borderLight },
                  ]}
                  onPress={() => onSelectAlbum(a)}
                >
                  <Icon
                    name={a.vault ? 'lock-outline' : 'image-multiple-outline'}
                    size={22}
                    color={a.vault ? '#ffa726' : colors.primary}
                  />
                  <Text style={[styles.rowName, { color: colors.text }]}>
                    {a.name}
                  </Text>
                  <Text
                    style={[styles.rowCount, { color: colors.textTertiary }]}
                  >
                    {a._count.photos} fotos
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  rowName: { fontSize: 15, fontWeight: '500', flex: 1 },
  rowCount: { fontSize: 13 },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 15 },
})

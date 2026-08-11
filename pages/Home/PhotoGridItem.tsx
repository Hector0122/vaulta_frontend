import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { ThemeColors } from '../../theme'

type PhotoGridItemPhoto = {
  uri: string
  id: string
  mimeType?: string
}

type Props = {
  photo: PhotoGridItemPhoto
  selected: boolean
  isFav: boolean
  isOffline: boolean
  isBlurry: boolean
  isPrivate: boolean
  selecting: boolean
  colors: ThemeColors
  toggleSelection: (id: string) => void
  handlePressImage: (data: { uri: string; id: string }) => void
  handleLongPressImage: (data: { uri: string; id: string }) => void
}

export const PhotoGridItem = React.memo(function PhotoGridItem({
  photo,
  selected,
  isFav,
  isOffline,
  isBlurry,
  isPrivate,
  selecting,
  colors,
  toggleSelection,
  handlePressImage,
  handleLongPressImage,
}: Props) {
  const { uri, id } = photo
  return (
    <View style={styles.gridItem}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (selecting) {
            toggleSelection(id)
          } else {
            handlePressImage({ uri, id })
          }
        }}
        onLongPress={() => {
          if (!selecting) handleLongPressImage({ uri, id })
        }}
      >
        <View
          style={[styles.cardInner, { backgroundColor: colors.surface }]}
        >
          <NitroImage
            image={{ url: uri }}
            style={styles.image}
            resizeMode="cover"
            recyclingKey={uri}
          />
          {photo.mimeType?.startsWith('video/') && (
            <View style={styles.videoOverlay}>
              <Icon
                name="play-circle"
                size={48}
                color="rgba(255,255,255,0.7)"
              />
            </View>
          )}
          {isBlurry && (
            <View style={styles.blurryBadge}>
              <Icon name="blur-off" size={16} color={colors.danger} />
            </View>
          )}
          {isPrivate && (
            <View style={styles.privateBadge}>
              <Icon name="eye-off-outline" size={16} color="#ffa726" />
            </View>
          )}
          {isOffline && (
            <View style={styles.offlineBadge}>
              <Icon
                name="cloud-outline"
                size={16}
                color={colors.offline}
              />
            </View>
          )}
          {isFav && (
            <View style={styles.favBadge}>
              <Icon
                name="heart"
                size={18}
                color={colors.favorite}
              />
            </View>
          )}
          {selected && (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.selectedOverlay,
                { backgroundColor: colors.overlay },
              ]}
            >
              <Icon name="check-circle" size={28} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  )
})

const styles = StyleSheet.create({
  gridItem: { padding: 3, flex: 1 },
  cardInner: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 250 },
  blurryBadge: { position: 'absolute', top: 4, left: 4 },
  privateBadge: { position: 'absolute', bottom: 24, right: 4 },
  offlineBadge: { position: 'absolute', bottom: 4, left: 4 },
  favBadge: { position: 'absolute', top: 4, right: 4 },
  selectedOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

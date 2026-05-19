import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { NitroImage } from 'react-native-nitro-image'
import Icon from 'react-native-vector-icons/MaterialIcons'
import type { ThemeColors } from '../../theme'

type PhotoGridItemPhoto = {
  uri: string
  mimeType?: string
}

type BadgeMap = Record<string, boolean | undefined>

type Props = {
  photo: PhotoGridItemPhoto
  selected: boolean
  isFav: boolean
  isOffline: boolean
  isBlurry: boolean
  isPrivate: boolean
  selecting: boolean
  colors: ThemeColors
  uriToFav: BadgeMap
  uriToOffline: BadgeMap
  uriToBlurred: BadgeMap
  uriToPrivate: BadgeMap
  selectedUris: string[]
  toggleSelection: (uri: string) => void
  handlePressImage: (data: { uri: string }) => void
  handleLongPressImage: (data: { uri: string }) => void
}

export function PhotoGridItem({
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
  const uri = photo.uri
  return (
    <View style={{ padding: 3, flex: 1 }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (selecting) {
            toggleSelection(uri)
          } else {
            handlePressImage({ uri })
          }
        }}
        onLongPress={() => {
          if (!selecting) handleLongPressImage({ uri })
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <NitroImage
            image={{ url: uri }}
            style={{ width: '100%', height: 250 }}
            resizeMode="cover"
            recyclingKey={uri}
          />
          {photo.mimeType?.startsWith('video/') && (
            <View style={styles.videoOverlay}>
              <Icon
                name="play-circle-filled"
                size={48}
                color="rgba(255,255,255,0.7)"
              />
            </View>
          )}
          {isBlurry && (
            <View style={{ position: 'absolute', top: 4, left: 4 }}>
              <Icon name="blur-off" size={16} color={colors.danger} />
            </View>
          )}
          {isPrivate && (
            <View style={{ position: 'absolute', bottom: 24, right: 4 }}>
              <Icon name="visibility-off" size={16} color="#ffa726" />
            </View>
          )}
          {isOffline && (
            <View style={{ position: 'absolute', bottom: 4, left: 4 }}>
              <Icon
                name="cloud-queue"
                size={16}
                color={colors.offline}
              />
            </View>
          )}
          {isFav && (
            <View style={{ position: 'absolute', top: 4, right: 4 }}>
              <Icon
                name="favorite"
                size={18}
                color={colors.favorite}
              />
            </View>
          )}
          {selected && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: colors.overlay,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              <Icon name="check-circle" size={28} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
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

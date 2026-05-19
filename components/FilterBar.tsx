import React from 'react'
import { View, Text, TouchableOpacity, Modal } from 'react-native'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import LazyCalendar from './LazyCalendar'
import type { ThemeColors } from '../theme'

type Props = {
  colors: ThemeColors
  rangeStart: string | null
  rangeEnd: string | null
  favoritesOnly: boolean
  blurryOnly: boolean
  onOpenDatePicker: () => void
  onClearDateRange: () => void
  onToggleFavorites: () => void
  onToggleBlurry: () => void
  onGoToProfile: () => void
}

export default function FilterBar({
  colors,
  rangeStart,
  rangeEnd,
  favoritesOnly,
  blurryOnly,
  onOpenDatePicker,
  onClearDateRange,
  onToggleFavorites,
  onToggleBlurry,
  onGoToProfile,
}: Props) {
  return (
    <View
      style={[
        styles.searchRow,
        {
          borderBottomColor: colors.borderLight,
          backgroundColor: colors.background,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.rangeField,
          { borderColor: colors.border, backgroundColor: colors.inputBg },
        ]}
        onPress={onOpenDatePicker}
      >
        <Icon name="calendar-today" size={16} color={colors.textTertiary} />
        <Text
          style={[
            styles.rangeFieldText,
            { color: rangeStart ? colors.text : colors.textTertiary },
          ]}
        >
          {rangeStart
            ? `${rangeStart.split('-').reverse().join('/')} — ${
                rangeEnd ? rangeEnd.split('-').reverse().join('/') : '...'
              }`
            : 'Todas las fotos'}
        </Text>
        {rangeStart && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onClearDateRange}
          >
            <Icon name="close" size={16} color={colors.danger} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onToggleFavorites}
        style={{ marginHorizontal: 4 }}
      >
        <Icon
          name={favoritesOnly ? 'favorite' : 'favorite-border'}
          size={22}
          color={colors.favorite}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onToggleBlurry}
        style={{ marginHorizontal: 4 }}
      >
        <Icon
          name={blurryOnly ? 'blur-off' : 'blur-on'}
          size={22}
          color={blurryOnly ? colors.danger : colors.textTertiary}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={onGoToProfile} style={{ marginLeft: 4 }}>
        <Icon name="person" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  rangeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rangeFieldText: { fontSize: 13, flex: 1 },
})

import React from 'react'
import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import type { ThemeColors } from '../theme'

type Props = {
  colors: ThemeColors
  rangeStart: string | null
  rangeEnd: string | null
  favoritesOnly: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  onOpenDatePicker: () => void
  onClearDateRange: () => void
  onToggleFavorites: () => void
  onGoToProfile: () => void
  onGoToPeople: () => void
  onOpenSelectRange: () => void
}

export default React.memo(function FilterBar({
  colors,
  rangeStart,
  rangeEnd,
  favoritesOnly,
  searchQuery,
  onSearchChange,
  onOpenDatePicker,
  onClearDateRange,
  onToggleFavorites,
  onGoToProfile,
  onGoToPeople,
  onOpenSelectRange,
}: Props) {
  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.borderLight,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.searchRow,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <Icon name="search" size={18} color={colors.primary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar por nombre o etiqueta..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchQuery !== '' && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onSearchChange('')}
          >
            <Icon name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.barRow}>
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
            numberOfLines={1}
            ellipsizeMode="tail"
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
          onPress={onOpenSelectRange}
          style={styles.filterIcon}
        >
          <Icon name="playlist-add-check" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onToggleFavorites}
          style={styles.filterIcon}
        >
          <Icon
            name={favoritesOnly ? 'favorite' : 'favorite-border'}
            size={22}
            color={colors.favorite}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onGoToPeople} style={styles.filterIcon}>
          <Icon name="face" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onGoToProfile} style={styles.profileIcon}>
          <Icon name="person" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
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
  filterIcon: { marginHorizontal: 4 },
  profileIcon: { marginLeft: 4 },
})

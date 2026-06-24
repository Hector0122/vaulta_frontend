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
  onYearPreset: (from: string, to: string) => void
}

export default function FilterBar({
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
  onYearPreset,
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
      <View style={styles.searchRow}>
        <Icon name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar fotos..."
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
      <YearPresets
        colors={colors}
        rangeStart={rangeStart}
        onSelectPreset={onYearPreset}
      />
    </View>
  )
}

type YearPresetsProps = {
  colors: ThemeColors
  rangeStart: string | null
  onSelectPreset: (from: string, to: string) => void
}

function YearPresets({ colors, rangeStart, onSelectPreset }: YearPresetsProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i)

  return (
    <View style={[styles.presetsRow, { borderTopColor: colors.borderLight }]}>
      {!rangeStart && (
        <>
          <TouchableOpacity
            style={[styles.presetChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => onSelectPreset(`${currentYear}-01-01`, `${currentYear}-12-31`)}
          >
            <Text style={[styles.presetText, { color: colors.textSecondary }]}>Este año</Text>
          </TouchableOpacity>
          {years.map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.presetChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => onSelectPreset(`${y}-01-01`, `${y}-12-31`)}
            >
              <Text style={[styles.presetText, { color: colors.textSecondary }]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
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
  presetsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderTopWidth: 1,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetText: { fontSize: 12 },
})

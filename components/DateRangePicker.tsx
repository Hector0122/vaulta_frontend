import React from 'react'
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import type { ThemeColors } from '../theme'

type Props = {
  visible: boolean
  rangeStart: string | null
  colors: ThemeColors
  onSelectYear: (year: number) => void
  onClose: () => void
}

export default function DateRangePicker({
  visible,
  rangeStart,
  colors,
  onSelectYear,
  onClose,
}: Props) {
  const currentYear = new Date().getFullYear()
  const years = Array.from(
    { length: currentYear - 1999 + 1 },
    (_, i) => currentYear - i,
  )

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Seleccionar año
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.yearList}>
            {years.map(year => {
              const selected = rangeStart?.startsWith(String(year))
              return (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearRow,
                    {
                      backgroundColor: selected
                        ? colors.primary + '20'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => onSelectYear(year)}
                >
                  <Text
                    style={[
                      styles.yearText,
                      {
                        color: selected ? colors.primary : colors.text,
                        fontWeight: selected ? '700' : '400',
                      },
                    ]}
                  >
                    {year}
                  </Text>
                  {selected && (
                    <Icon
                      name="check"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  yearList: { paddingBottom: 16 },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  yearText: { fontSize: 16 },
})

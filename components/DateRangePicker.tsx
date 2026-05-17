import React from 'react'
import { View, Text, TouchableOpacity, Modal } from 'react-native'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import LazyCalendar from './LazyCalendar'

type Props = {
  visible: boolean
  rangeStart: string | null
  rangeEnd: string | null
  colors: any
  onDayPress: (day: { dateString: string }) => void
  onSelectToday: () => void
  onClose: () => void
}

export default function DateRangePicker({
  visible,
  rangeStart,
  rangeEnd,
  colors,
  onDayPress,
  onSelectToday,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {rangeStart ? 'Selecciona fecha fin' : 'Selecciona fecha inicio'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <LazyCalendar
            current={rangeStart || undefined}
            minDate="2020-01-01"
            maxDate={new Date().toISOString().split('T')[0]}
            onDayPress={onDayPress}
            markedDates={
              rangeStart
                ? {
                    [rangeStart]: {
                      selected: true,
                      color: colors.primary,
                      startingDay: !rangeEnd || rangeStart <= rangeEnd,
                      ...(rangeEnd ? {} : { endingDay: true }),
                      ...(rangeEnd && rangeStart === rangeEnd ? { endingDay: true } : {}),
                    },
                    ...(rangeEnd && rangeEnd !== rangeStart
                      ? Object.fromEntries(
                          (() => {
                            const dates: [string, any][] = []
                            const start = new Date(rangeStart)
                            const end = new Date(rangeEnd)
                            if (start > end) return dates
                            const cursor = new Date(start)
                            while (cursor <= end) {
                              const ds = cursor.toISOString().split('T')[0]
                              if (ds === rangeStart) {
                                dates.push([ds, { selected: true, color: colors.primary, startingDay: true }])
                              } else if (ds === rangeEnd) {
                                dates.push([ds, { selected: true, color: colors.primary, endingDay: true }])
                              } else {
                                dates.push([ds, { selected: true, color: colors.primary + '40' }])
                              }
                              cursor.setDate(cursor.getDate() + 1)
                            }
                            return dates
                          })(),
                        )
                      : {}),
                  }
                : {}
            }
            markingType="period"
            theme={{
              todayTextColor: colors.primary,
              selectedDayBackgroundColor: colors.primary,
              arrowColor: colors.primary,
              textSectionTitleColor: colors.textSecondary,
              todayBackgroundColor: colors.primary + '20',
              calendarBackground: colors.surface,
              dayTextColor: colors.text,
              monthTextColor: colors.text,
              textDisabledColor: colors.textTertiary,
            }}
          />
          {rangeStart && !rangeEnd && (
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={onSelectToday}>
              <Text style={styles.applyBtnText}>Este día</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  applyBtn: { marginTop: 12, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})

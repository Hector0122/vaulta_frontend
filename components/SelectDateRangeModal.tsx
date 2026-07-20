import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import LazyCalendar from './LazyCalendar'
import type { ThemeColors } from '../theme'

type Props = {
  visible: boolean
  colors: ThemeColors
  loading: boolean
  onClose: () => void
  onConfirm: (start: string, end: string) => void
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

export default function SelectDateRangeModal({
  visible,
  colors,
  loading,
  onClose,
  onConfirm,
}: Props) {
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setDateFrom(null)
      setDateTo(null)
    }
  }, [visible])

  const applyPreset = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
  }

  const presets = [
    { label: 'Hoy', from: isoDate(new Date()), to: isoDate(new Date()) },
    { label: 'Últimos 7 días', from: daysAgo(6), to: isoDate(new Date()) },
    { label: 'Últimos 14 días', from: daysAgo(13), to: isoDate(new Date()) },
    { label: 'Últimos 30 días', from: daysAgo(29), to: isoDate(new Date()) },
  ]

  const markedDates: Record<string, any> = {}
  if (dateFrom) {
    markedDates[dateFrom] = { selected: true, startingDay: true, color: colors.primary }
  }
  if (dateTo) {
    markedDates[dateTo] = { selected: true, endingDay: true, color: colors.primary }
  }
  if (dateFrom && dateTo) {
    const s = new Date(dateFrom)
    const e = new Date(dateTo)
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const ds = isoDate(d)
      if (ds !== dateFrom && ds !== dateTo) {
        markedDates[ds] = { selected: true, color: colors.primary + '44' }
      }
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Seleccionar por fecha
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.presetRow}>
            {presets.map(p => (
              <TouchableOpacity
                key={p.label}
                style={[
                  styles.presetChip,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      dateFrom === p.from && dateTo === p.to
                        ? colors.primary + '20'
                        : colors.surfaceAlt,
                  },
                ]}
                onPress={() => applyPreset(p.from, p.to)}
              >
                <Text
                  style={[
                    styles.presetText,
                    {
                      color:
                        dateFrom === p.from && dateTo === p.to
                          ? colors.primary
                          : colors.text,
                    },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <LazyCalendar
            onDayPress={(day: { dateString: string }) => {
              if (!dateFrom || (dateFrom && dateTo)) {
                setDateFrom(day.dateString)
                setDateTo(null)
              } else if (day.dateString < dateFrom) {
                setDateTo(dateFrom)
                setDateFrom(day.dateString)
              } else {
                setDateTo(day.dateString)
              }
            }}
            markedDates={markedDates}
            markingType="period"
            theme={{
              todayTextColor: colors.primary,
              selectedDayBackgroundColor: colors.primary,
              arrowColor: colors.primary,
              calendarBackground: colors.background,
              dayTextColor: colors.text,
              monthTextColor: colors.text,
              textDisabledColor: colors.textTertiary,
            }}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                styles.modalBtnOutline,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              disabled={!dateFrom || !dateTo || loading}
              onPress={() => dateFrom && dateTo && onConfirm(dateFrom, dateTo)}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.modalBtnText, styles.modalBtnTextLight]}>
                  Seleccionar
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  presetText: { fontSize: 13, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnOutline: { borderWidth: 1 },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  modalBtnTextLight: { color: '#fff' },
})

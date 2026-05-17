import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme';
import { useThemeMode } from '../../context/ThemeContext';
import '../../utils/calendarLocales'
import LazyCalendar from '../../components/LazyCalendar';
import { authenticatedPatch, authenticatedGet, authenticatedPost, exportAllPhotos, exportByDate } from '../../api/client';
import { useToast } from '../../context/ToastContext';
export default function ProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<{ Duplicates: undefined; Trash: undefined }>>();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{
    photoCount: number;
    albumCount: number;
    favoriteCount: number;
    blurryCount: number;
  } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const { showToast } = useToast()

  useEffect(() => {
    authenticatedGet<{
      photoCount: number;
      albumCount: number;
      favoriteCount: number;
      blurryCount: number;
    }>('photos/stats')
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (name) body.name = name;
      if (email) body.email = email;
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      await authenticatedPatch('auth/profile', body);
      Alert.alert(
        'Perfil actualizado',
        'Los cambios se aplicarán al volver a iniciar sesión',
      );
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const nextMode =
    themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
  const modeLabels: Record<string, string> = {
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
  };
  const modeIcons: Record<string, string> = {
    light: 'light-mode',
    dark: 'dark-mode',
    system: 'brightness-auto',
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {stats && (
        <View style={[styles.statsCard, { backgroundColor: colors.cardBg }]}>
          <View style={styles.statItem}>
            <Icon name="photo-library" size={24} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.photoCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              Fotos
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />
          <View style={styles.statItem}>
            <Icon name="photo-album" size={24} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.albumCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              Álbumes
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />
          <View style={styles.statItem}>
            <Icon name="favorite" size={24} color={colors.favorite} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.favoriteCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              Favoritos
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />
          <View style={styles.statItem}>
            <Icon name="blur-off" size={24} color={colors.danger} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.blurryCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              Borrosas
            </Text>
          </View>
        </View>
      )}
      <View style={[styles.analysisRow, { gap: 8 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={async () => {
            try {
              const res = await authenticatedPost<{ analyzed: number }>('photos/analyze-all');
              Alert.alert('Análisis completo', `${res.analyzed} foto(s) analizada(s)`);
              const newStats = await authenticatedGet<{ photoCount: number; albumCount: number; favoriteCount: number; blurryCount: number }>('photos/stats');
              setStats(newStats);
            } catch {
              Alert.alert('Error', 'No se pudo analizar');
            }
          }}
        >
          <Icon name="auto-fix" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Analizar fotos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('Duplicates')}
        >
          <Icon name="content-copy" size={18} color={colors.text} />
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Duplicados</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.analysisRow, { gap: 8, marginTop: 8 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('Trash')}
        >
          <Icon name="delete-sweep" size={18} color={colors.text} />
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Papelera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1 }]}
          onPress={async () => {
            try {
              await exportAllPhotos()
              showToast({ message: 'Exportación iniciada', type: 'info' })
            } catch {
              showToast({ message: 'No se pudo exportar', type: 'error' })
            }
          }}
        >
          <Icon name="file-download" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Exportar todo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="date-range" size={18} color={colors.text} />
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Por fecha</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectingEnd ? 'Selecciona fecha fin' : 'Selecciona fecha inicio'}
              </Text>
              <TouchableOpacity onPress={() => { setShowDatePicker(false); setDateFrom(null); setDateTo(null); setSelectingEnd(false) }}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {dateFrom && (
              <Text style={[styles.dateRangeInfo, { color: colors.textSecondary }]}>
                Desde: {dateFrom}{dateTo ? `  Hasta: ${dateTo}` : ''}
              </Text>
            )}
            <LazyCalendar
              onDayPress={(day: { dateString: string }) => {
                if (!selectingEnd) {
                  setDateFrom(day.dateString)
                  setSelectingEnd(true)
                } else {
                  setDateTo(day.dateString)
                }
              }}
              markedDates={{
                ...(dateFrom ? { [dateFrom]: { selected: true, startingDay: true, color: colors.primary } } : {}),
                ...(dateTo ? { [dateTo]: { selected: true, endingDay: true, color: colors.primary } } : {}),
                ...(dateFrom && dateTo ? Object.fromEntries(
                  (() => {
                    const dates: [string, any][] = []
                    const start = new Date(dateFrom)
                    const end = new Date(dateTo)
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                      const ds = d.toISOString().slice(0, 10)
                      if (ds !== dateFrom && ds !== dateTo) {
                        dates.push([ds, { selected: true, color: colors.primary + '44' }])
                      }
                    }
                    return dates
                  })()
                ) : {})
              }}
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
                style={[styles.modalBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => { setDateFrom(null); setDateTo(null); setSelectingEnd(false) }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!dateFrom || !dateTo) {
                    Alert.alert('Selecciona fecha inicio y fin')
                    return
                  }
                  setShowDatePicker(false)
                  try {
                    await exportByDate(dateFrom, dateTo)
                    showToast({ message: 'Exportación iniciada', type: 'info' })
                  } catch {
                    showToast({ message: 'No se pudieron exportar las fotos', type: 'error' })
                  }
                  setDateFrom(null)
                  setDateTo(null)
                  setSelectingEnd(false)
                }}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Exportar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Nombre
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.inputBg,
          },
        ]}
        value={name}
        onChangeText={setName}
        placeholder="Tu nombre"
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.inputBg,
          },
        ]}
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={colors.textTertiary}
      />

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Contraseña actual
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.inputBg,
          },
        ]}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Dejar vacío si no cambias"
        secureTextEntry
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Nueva contraseña
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.inputBg,
          },
        ]}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
        placeholderTextColor={colors.textTertiary}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Guardar cambios</Text>
        )}
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      <TouchableOpacity
        style={styles.themeRow}
        onPress={() => setThemeMode(nextMode)}
      >
        <View style={styles.themeRowLeft}>
          <Icon name={modeIcons[themeMode]} size={22} color={colors.text} />
          <Text style={[styles.themeLabel, { color: colors.text }]}>Tema</Text>
        </View>
        <View style={styles.themeRowRight}>
          <Text style={[styles.themeValue, { color: colors.textSecondary }]}>
            {modeLabels[themeMode]}
          </Text>
          <Icon name="chevron-right" size={22} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={[styles.logoutText, { color: colors.danger }]}>
          Cerrar sesión
        </Text>
      </TouchableOpacity>

    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  divider: { height: 1, marginVertical: 16 },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logout: { marginTop: 20, alignItems: 'center' },
  logoutText: { fontSize: 16 },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  themeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  themeRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  themeLabel: { fontSize: 16 },
  themeValue: { fontSize: 14 },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 40 },
  statNumber: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 12, marginTop: 2 },
  analysisRow: { flexDirection: 'row', marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  dateRangeInfo: { fontSize: 13, marginBottom: 8, textAlign: 'center' },
  modalActions: {
    flexDirection: 'row', gap: 12, marginTop: 16,
  },
  modalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
});

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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme';
import { useThemeMode } from '../../context/ThemeContext';
import { authenticatedPatch, authenticatedGet, authenticatedPost } from '../../api/client';

export default function ProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<{ Duplicates: undefined }>>();
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
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={async () => {
            try {
              const res = await authenticatedPost<{ message: string }>('photos/export');
              Alert.alert('Exportación', res.message);
            } catch {
              Alert.alert('Error', 'No se pudo exportar');
            }
          }}
        >
          <Icon name="file-download" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Exportar todo</Text>
        </TouchableOpacity>
      </View>

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
});

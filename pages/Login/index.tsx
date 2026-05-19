import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../theme'
import VaultaLogo from '../../components/VaultaLogo'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const {
    login,
    register,
    biometricAvailable,
    biometricEnabled,
    biometricLabel,
    enableBiometric,
    biometricLogin,
  } = useAuth()
  const { colors } = useTheme()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert('Error', 'Completa todos los campos')
      return
    }
    if (!EMAIL_RE.test(email)) {
      Alert.alert('Error', 'Correo electrónico inválido')
      return
    }
    if (isRegister && password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      if (isRegister) {
        await register(email, name, password)
      } else {
        await login(email, password)
      }
      if (biometricAvailable && !biometricEnabled && !isRegister) {
        setTimeout(() => {
          Alert.alert(
            '¿Activar ' + biometricLabel + '?',
            'Puedes iniciar sesión con tu huella digital en lugar de escribir tu correo y contraseña cada vez.',
            [
              { text: 'Ahora no', style: 'cancel' },
              { text: 'Activar', onPress: () => enableBiometric() },
            ],
          )
        }, 500)
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Algo salió mal'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandSection}>
          <VaultaLogo color={colors.text} />
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
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
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoFocus
        />

        {isRegister && (
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.inputBg,
              },
            ]}
            placeholder="Nombre"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
          />
        )}

        <View
          style={[
            styles.passwordRow,
            { borderColor: colors.border, backgroundColor: colors.inputBg },
          ]}
        >
          <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder="Contraseña"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(v => !v)}
          >
            <Icon
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={22}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isRegister ? 'Registrarse' : 'Entrar'}
            </Text>
          )}
        </TouchableOpacity>

        {biometricAvailable && biometricEnabled && !isRegister && (
          <>
            <View
              style={[styles.divider, { backgroundColor: colors.borderLight }]}
            />
            <TouchableOpacity
              style={[styles.biometricBtn, { borderColor: colors.border }]}
              onPress={async () => {
                const ok = await biometricLogin()
                if (!ok)
                  Alert.alert(
                    'Error',
                    'No se pudo iniciar sesión. Ingresa manualmente.',
                  )
              }}
            >
              <Icon name="fingerprint" size={22} color={colors.primary} />
              <Text
                style={[styles.biometricBtnText, { color: colors.primary }]}
              >
                Entrar con {biometricLabel}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
          <Text style={[styles.switchText, { color: colors.textSecondary }]}>
            {isRegister
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿Sin cuenta? Regístrate'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  eyeBtn: { paddingHorizontal: 12 },
  switchText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
  },
  divider: { height: 1, marginVertical: 16 },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 4,
  },
  biometricBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
})

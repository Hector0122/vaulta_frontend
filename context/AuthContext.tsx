import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { login as apiLogin, register as apiRegister } from '../api/auth';
import { getToken, setToken, clearToken, setRefreshToken, clearRefreshToken, setOnUnauthorized, clearOnUnauthorized, authenticatedPost } from '../api/client';
import { clearCachedPhotos } from '../api/cache';
import { clearAllOffline } from '../api/offline';
import { registerFcmToken } from '../api/notifications';
import { isBiometricsAvailable } from '../services/biometrics';
import { storage } from '../api/storage';
import * as Keychain from 'react-native-keychain'

const BIOMETRIC_KEY = 'biometric_login_enabled'
const KEYCHAIN_SERVICE = 'vaulta-login'

function safeAtob(base64: string): string {
  try {
    return atob(base64);
  } catch {
    return '';
  }
}

type User = { id: string; email: string; name: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  biometricNeeded: boolean;
  biometricAvailable: boolean;
  biometricLabel: string;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  biometricLogin: () => Promise<boolean>;
  handleBiometricSuccess: () => void;
  dismissBiometricGate: () => void;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  biometricEnabled: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricNeeded, setBiometricNeeded] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('biometría');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { available, biometryLabel } = await isBiometricsAvailable()
      if (!cancelled) {
        setBiometricAvailable(available)
        setBiometricLabel(biometryLabel)
      }

      const enabled = storage.getBoolean(BIOMETRIC_KEY) ?? false
      if (!cancelled) setBiometricEnabled(enabled)

      const token = await getToken()
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const raw = safeAtob(base64);
            const json = decodeURIComponent(
              raw
                .split('')
                .map(
                  (c: string) =>
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2),
                )
                .join(''),
            );
            const payload = JSON.parse(json);
            if (!cancelled) {
              if (enabled && available) setBiometricNeeded(true)
              setUser({ id: payload.sub, email: payload.email || '', name: payload.name || '' })
            }
          }
        } catch {
          await clearToken();
        }
      }
      if (!cancelled) setLoading(false);
    })()

    setOnUnauthorized(() => {
      setUser(null)
    })

    return () => {
      cancelled = true
      clearOnUnauthorized()
    }
  }, []);

  const saveCredentials = useCallback(async (email: string, password: string) => {
    try {
      await Keychain.setGenericPassword(email, password, {
        service: KEYCHAIN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      })
    } catch { /* keychain not available */ }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    await setToken(result.token);
    if (result.refreshToken) await setRefreshToken(result.refreshToken);
    setUser(result.user);
    saveCredentials(email, password)
    registerFcmToken().catch(() => {});
  }, [saveCredentials]);

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      const result = await apiRegister(email, name, password);
      await setToken(result.token);
      if (result.refreshToken) await setRefreshToken(result.refreshToken);
      setUser(result.user);
      saveCredentials(email, password)
      registerFcmToken().catch(() => {});
    },
    [saveCredentials],
  );

  const logout = useCallback(async () => {
    try {
      await authenticatedPost('auth/logout')
    } catch { /* ignore */ }
    const uid = user?.id
    await clearToken();
    await clearRefreshToken();
    setUser(null);
    if (uid) {
      clearCachedPhotos(uid)
      clearAllOffline(uid)
    }
  }, [user]);

  const biometricLogin = useCallback(async () => {
    const token = await getToken()
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length !== 3) return false
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const raw = safeAtob(base64)
        const json = decodeURIComponent(
          raw.split('').map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
        )
        const payload = JSON.parse(json)
        setUser({ id: payload.sub, email: payload.email || '', name: payload.name || '' })
        registerFcmToken().catch(() => {})
        return true
      } catch {
        return false
      }
    }
    try {
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
        authenticationPrompt: {
          title: 'Inicia sesión con tu huella',
          subtitle: 'Usa tu huella digital para acceder',
          cancel: 'Cancelar',
        },
      })
      if (credentials) {
        await login(credentials.username, credentials.password)
        return true
      }
    } catch { /* user cancelled or no credentials */ }
    return false
  }, [login])

  const handleBiometricSuccess = useCallback(() => {
    setBiometricNeeded(false)
  }, [])

  const dismissBiometricGate = useCallback(() => {
    setBiometricNeeded(false)
    setUser(null)
  }, [])

  const enableBiometric = useCallback(async () => {
    storage.set(BIOMETRIC_KEY, true)
    setBiometricEnabled(true)
  }, [])

  const disableBiometric = useCallback(async () => {
    storage.remove(BIOMETRIC_KEY)
    setBiometricEnabled(false)
    try {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE })
    } catch { /* ignore */ }
  }, [])

  const value = useMemo(() => ({
    user, loading, biometricNeeded, biometricAvailable, biometricLabel,
    biometricEnabled, login, register, logout, biometricLogin,
    handleBiometricSuccess, dismissBiometricGate, enableBiometric, disableBiometric,
  }), [user, loading, biometricNeeded, biometricAvailable, biometricLabel,
    biometricEnabled, login, register, logout, biometricLogin,
    handleBiometricSuccess, dismissBiometricGate, enableBiometric, disableBiometric])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

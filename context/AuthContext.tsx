import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { login as apiLogin, register as apiRegister } from '../api/auth';
import { getToken, setToken, clearToken, setRefreshToken, clearRefreshToken, setOnUnauthorized, clearOnUnauthorized, authenticatedPost } from '../api/client';
import { clearCachedPhotos } from '../api/cache';
import { clearAllOffline } from '../api/offline';

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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken()
      .then(async token => {
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
              setUser({ id: payload.sub, email: payload.email || '', name: payload.name || '' });
            }
          } catch {
            await clearToken();
          }
        }
      })
      .finally(() => setLoading(false));

    setOnUnauthorized(() => {
      setUser(null)
    })

    return () => {
      clearOnUnauthorized()
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    await setToken(result.token);
    if (result.refreshToken) await setRefreshToken(result.refreshToken);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      const result = await apiRegister(email, name, password);
      await setToken(result.token);
      if (result.refreshToken) await setRefreshToken(result.refreshToken);
      setUser(result.user);
    },
    [],
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

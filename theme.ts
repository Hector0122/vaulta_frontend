import { useThemeMode } from './context/ThemeContext'

const light = {
  background: '#fff',
  surface: '#f8f8f8',
  surfaceAlt: '#f5f5f5',
  text: '#222',
  textSecondary: '#666',
  textTertiary: '#999',
  border: '#ddd',
  borderLight: '#eee',
  primary: '#007AFF',
  danger: '#ff5252',
  favorite: '#ff4081',
  offline: '#4fc3f7',
  success: '#4CAF50',
  tabBarBg: '#fff',
  tabBarActive: '#007AFF',
  tabBarInactive: 'gray',
  overlay: 'rgba(0,122,255,0.25)',
  cardBg: '#f8f8f8',
  inputBg: '#fff',
  skeleton: '#e0e0e0',
}

const dark = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceAlt: '#2a2a2a',
  text: '#e0e0e0',
  textSecondary: '#aaa',
  textTertiary: '#888',
  border: '#333',
  borderLight: '#2a2a2a',
  primary: '#007AFF',
  danger: '#ff5252',
  favorite: '#ff4081',
  offline: '#4fc3f7',
  success: '#4CAF50',
  tabBarBg: '#1e1e1e',
  tabBarActive: '#007AFF',
  tabBarInactive: '#888',
  overlay: 'rgba(0,122,255,0.35)',
  cardBg: '#1e1e1e',
  inputBg: '#2a2a2a',
  skeleton: '#2a2a2a',
}

export function useTheme() {
  const { isDark } = useThemeMode()
  return { isDark, colors: isDark ? dark : light }
}

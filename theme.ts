import { useThemeMode } from './context/ThemeContext'

// VAULTA brand palette
// Primary teal: #2BD4CE  |  Purple accent: #7B6BF5
// Dark bg: #0F0F0F       |  Surface: #1A1A1A

const light = {
  background: '#fff',
  surface: '#f8f8f8',
  surfaceAlt: '#f5f5f5',
  text: '#222',
  textSecondary: '#666',
  textTertiary: '#999',
  border: '#ddd',
  borderLight: '#eee',
  primary: '#2BD4CE',
  accent: '#7B6BF5',
  danger: '#ff5252',
  favorite: '#7B6BF5',
  offline: '#4fc3f7',
  success: '#4CAF50',
  tabBarBg: '#fff',
  tabBarActive: '#2BD4CE',
  tabBarInactive: 'gray',
  overlay: 'rgba(43,212,206,0.25)',
  cardBg: '#f8f8f8',
  inputBg: '#fff',
  skeleton: '#e0e0e0',
}

const dark = {
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceAlt: '#252525',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textTertiary: '#777777',
  border: '#2E2E2E',
  borderLight: '#1E1E1E',
  primary: '#2BD4CE',
  accent: '#7B6BF5',
  danger: '#ff5252',
  favorite: '#7B6BF5',
  offline: '#4fc3f7',
  success: '#4CAF50',
  tabBarBg: '#1A1A1A',
  tabBarActive: '#2BD4CE',
  tabBarInactive: '#555555',
  overlay: 'rgba(43,212,206,0.25)',
  cardBg: '#1A1A1A',
  inputBg: '#252525',
  skeleton: '#252525',
}

export function useTheme() {
  const { isDark } = useThemeMode()
  return { isDark, colors: isDark ? dark : light }
}

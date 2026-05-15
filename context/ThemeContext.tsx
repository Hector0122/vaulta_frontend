import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

type ThemeMode = 'light' | 'dark' | 'system'

type ThemeContextType = {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  setThemeMode: () => {},
  isDark: false,
})

const THEME_KEY = '@mymega_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemDark = useColorScheme() === 'dark'
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setThemeModeState(val)
      }
      setLoaded(true)
    })
  }, [])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
    AsyncStorage.setItem(THEME_KEY, mode)
  }

  const isDark = themeMode === 'system' ? systemDark : themeMode === 'dark'

  const value = useMemo(() => ({ themeMode, setThemeMode, isDark }), [themeMode, isDark])

  if (!loaded) return null

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeMode() {
  return useContext(ThemeContext)
}

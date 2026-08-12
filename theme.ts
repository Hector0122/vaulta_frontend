import { useThemeMode } from './context/ThemeContext'
import { createAppTheme, brands } from './tokens'

// Colores derivados de arcd_kit/tokens.ts en vez de hex a mano — antes este
// archivo duplicaba primary/accent (coincidían por casualidad) pero
// success/danger/overlay/fondos eran propios y habían divergido del resto
// del sistema. `offline` y `tabBarInactive` no tienen equivalente en
// arcd_kit (no son parte del esquema compartido) y se quedan como colores
// propios de Vaulta.
const { light: base, dark: baseDark } = createAppTheme(brands.vaulta)

export type ThemeColors = {
  background: string
  surface: string
  surfaceAlt: string
  text: string
  textSecondary: string
  textTertiary: string
  border: string
  borderLight: string
  primary: string
  accent: string
  danger: string
  favorite: string
  offline: string
  success: string
  tabBarBg: string
  tabBarActive: string
  tabBarInactive: string
  overlay: string
  cardBg: string
  inputBg: string
  skeleton: string
}

const light: ThemeColors = {
  background: base.background,
  surface: base.surface,
  surfaceAlt: base.surfaceAlt,
  text: base.text,
  textSecondary: base.textSecondary,
  textTertiary: base.textTertiary,
  border: base.border,
  borderLight: base.borderLight,
  primary: base.primary,
  accent: base.accent,
  danger: base.danger,
  favorite: base.accent,
  offline: '#4fc3f7',
  success: base.success,
  tabBarBg: base.background,
  tabBarActive: base.primary,
  tabBarInactive: 'gray',
  overlay: base.overlay,
  cardBg: base.cardBg,
  inputBg: base.inputBg,
  skeleton: base.skeleton,
}

const dark: ThemeColors = {
  background: baseDark.background,
  surface: baseDark.surface,
  surfaceAlt: baseDark.surfaceAlt,
  text: baseDark.text,
  textSecondary: baseDark.textSecondary,
  textTertiary: baseDark.textTertiary,
  border: baseDark.border,
  borderLight: baseDark.borderLight,
  primary: baseDark.primary,
  accent: baseDark.accent,
  danger: baseDark.danger,
  favorite: baseDark.accent,
  offline: '#4fc3f7',
  success: baseDark.success,
  tabBarBg: baseDark.surface,
  tabBarActive: baseDark.primary,
  tabBarInactive: '#555555',
  overlay: baseDark.overlay,
  cardBg: baseDark.cardBg,
  inputBg: baseDark.inputBg,
  skeleton: baseDark.skeleton,
}

export function useTheme() {
  const { isDark } = useThemeMode()
  return { isDark, colors: isDark ? dark : light }
}

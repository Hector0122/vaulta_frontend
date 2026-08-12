/**
 * @hector/brand-kit — tokens compartidos entre todas las apps de producto
 * (Varo, VaultGaming, Vaulta, Vellum, Veya, Velody).
 *
 * Filosofía: lo que se comparte es la ESTRUCTURA (grises, spacing, radios,
 * sombras, motion, escala tipográfica). Lo que NO se comparte a propósito
 * es el color de marca (`primary`/`accent`) — cada app conserva su propia
 * identidad dentro de la misma "familia" visual. Ver `brands` al final
 * y README.md para el razonamiento completo.
 *
 * Uso en cada app:
 *   import { createAppTheme, brands, motion, spacing, radius, type } from './tokens';
 *   const { light, dark } = createAppTheme(brands.varo);
 */

// ---------------------------------------------------------------------------
// Neutros — la misma rampa de grises en las 6 apps. Esto es lo que más
// "empareja" visualmente aunque cada una tenga su propio color de marca.
// ---------------------------------------------------------------------------
export const neutrals = {
  0: '#FFFFFF',
  50: '#F7F8F9',
  100: '#EEF0F2',
  200: '#DEE2E6',
  300: '#C3C9D0',
  400: '#9AA3AD',
  500: '#717A85',
  600: '#4E555F',
  700: '#343941',
  800: '#22262B',
  850: '#181B1F',
  900: '#101214',
  950: '#0A0B0D',
} as const;

// Semánticos: iguales en todas las apps. El primary/accent de marca NO
// vive aquí — así se evita lo que pasa hoy en Varo (verde de "progreso"
// haciendo doble función de color de marca y de estado "success").
export const semantic = {
  success: { light: '#2FBF71', dark: '#3ED88B' },
  danger: { light: '#E5484D', dark: '#FF6369' },
  warning: { light: '#F5A623', dark: '#FFC24B' },
  info: { light: '#4C8DFF', dark: '#6EA2FF' },
} as const;

// ---------------------------------------------------------------------------
// Paleta de marca — UN solo hex por nombre de color en TODO el sistema,
// sin excepciones. Antes cada app inventaba su propio tono de "amarillo"
// o "morado" y terminábamos con 3 amarillos y 2 morados casi idénticos.
// Ahora cada app referencia estos nombres — no vuelve a pasar.
//
// Cuando un color de marca coincide con un semántico (verde de Varo =
// success, rojo de VaultGaming = danger) NO se redefine el hex: se
// referencia el mismo valor de `semantic`, para que sea imposible que
// diverjan con el tiempo.
// ---------------------------------------------------------------------------
export const hues = {
  green: semantic.success.light, // Varo — ahorro = progreso, mismo verde que success
  azure: semantic.info.light, // Varo (acento) — mismo azul que info
  slateBlue: '#4A7DB8', // Vellum — azul apagado de "papel", distinto de azure a propósito
  blue: '#3B82F6', // Velody — azul vívido de marca (antes blue-500/600 de Tailwind, sin curar), distinto de azure/slateBlue a propósito
  teal: '#2BD4CE', // Vaulta / Veya
  purple: '#7B6BF5', // Vaulta / Veya / Velody
  amber: semantic.warning.light, // VaultGaming / Vellum — mismo ámbar que warning
  red: semantic.danger.light, // VaultGaming — mismo rojo que danger, sin excepción
  orange: '#F97316', // sin usar hoy en brands — Velody usa naranja como acento secundario propio (loop markers, toggles), no como color de marca
} as const;

// ---------------------------------------------------------------------------
// Spacing — grid de 4pt
// ---------------------------------------------------------------------------
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 64,
} as const;

// ---------------------------------------------------------------------------
// Radios — misma "personalidad de esquina" en todas las apps
// ---------------------------------------------------------------------------
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// ---------------------------------------------------------------------------
// Tamaño de icono — mismo problema que los radios: sin una escala, cada
// pantalla mete un número a ojo (13, 16, 18, 20, 22...) y el resultado son
// iconos que se ven "chiquitos" al lado de texto normal en unas pantallas
// y bien en otras. `md` (22) es el default para casi todo — tab bars,
// headers, botones de acción; usa `sm` solo para iconos realmente
// secundarios/inline, nunca por debajo de eso.
// ---------------------------------------------------------------------------
export const iconSize = {
  sm: 18, // secundario / inline junto a texto pequeño (badges, chips)
  md: 22, // default — tabs, headers, botones de acción, la mayoría de los casos
  lg: 28, // avatares chicos, iconos destacados de una card
  xl: 48, // empty states / hero
} as const;

// ---------------------------------------------------------------------------
// Elevación / sombra (RN: shadow* + elevation para Android)
// ---------------------------------------------------------------------------
export const elevation = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
} as const;

// ---------------------------------------------------------------------------
// Motion — el token que hoy no existe en NINGUNA app y que más se nota
// cuando falta: cada pantalla anima "a su manera". Usar con Reanimated
// (Easing.bezier(...)) o react-native-reanimated withSpring.
// ---------------------------------------------------------------------------
export const motion = {
  duration: {
    instant: 100, // micro-feedback (checkbox, toggle)
    fast: 150, // hover/press states, cambios de tab
    base: 220, // default para casi todo (abrir modal, expandir card)
    slow: 350, // transiciones de pantalla completa
    deliberate: 500, // momentos "hero": onboarding, celebración, empty state
  },
  // Cubic-bezier listos para Easing.bezier(x1,y1,x2,y2) de Reanimated
  easing: {
    standard: [0.2, 0, 0, 1] as [number, number, number, number],
    decelerate: [0, 0, 0, 1] as [number, number, number, number],
    accelerate: [0.3, 0, 1, 1] as [number, number, number, number],
  },
  spring: {
    press: { damping: 18, stiffness: 220, mass: 0.9 }, // botones, tap feedback
    gentle: { damping: 20, stiffness: 140, mass: 1 }, // cards, modales
  },
} as const;

// ---------------------------------------------------------------------------
// Tipografía
// ---------------------------------------------------------------------------
// Regla: Archivo Black y IBM Plex Mono son la "firma" — se usan con
// moderación (igual que ya haces en el portfolio). El texto de lectura
// larga (párrafos, listas) se queda en la fuente del sistema por
// legibilidad — especialmente crítico en Vellum, que es un lector.
export const fontFamily = {
  display: 'ArchivoBlack-Regular', // headlines, empty states, números hero
  mono: 'IBMPlexMono-Medium', // labels, cifras, badges, timestamps, nav
  body: undefined, // system default a propósito (San Francisco / Roboto)
} as const;

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontFamily: fontFamily.display },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.mono, fontWeight: '500' as const },
  caption: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.mono, fontWeight: '500' as const },
} as const;

// ---------------------------------------------------------------------------
// Theme factory — mismo shape que ya usa Vaulta (el más completo hoy),
// así la migración de cada app es mecánica: solo cambian primary/accent.
// ---------------------------------------------------------------------------
export type BrandAccent = { primary: string; accent: string };

// rgba(hex, alpha) — para fondos "soft" de badges/highlights sin depender
// de que cada app lo reinvente (Vellum ya tenía su propio accentSoft suelto).
// Exportado: úsalo también para tintes de estado (ver VaultGaming StatusBadge).
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(full, 16);
  /* eslint-disable no-bitwise -- plain RGB channel extraction from a hex int */
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  /* eslint-enable no-bitwise */
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Tipo explícito para que TypeScript compare `light`/`dark` estructuralmente
// como `string`, no como los tipos-literal que arrastra `neutrals` (que es
// `as const`) — sin esto, asignar el objeto "equivocado" (claro en vez de
// oscuro) no marcaba error de tipos donde debería.
export type AppThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  overlay: string;
  inputBg: string;
  cardBg: string;
  skeleton: string;
};

export function createAppTheme(brand: BrandAccent) {
  const light: AppThemeColors = {
    background: neutrals[0],
    surface: neutrals[50],
    surfaceAlt: neutrals[100],
    border: neutrals[200],
    borderLight: neutrals[100],
    text: neutrals[900],
    textSecondary: neutrals[600],
    textTertiary: neutrals[500],
    textMuted: neutrals[400],
    primary: brand.primary,
    primarySoft: hexToRgba(brand.primary, 0.12),
    accent: brand.accent,
    accentSoft: hexToRgba(brand.accent, 0.12),
    success: semantic.success.light,
    danger: semantic.danger.light,
    warning: semantic.warning.light,
    info: semantic.info.light,
    overlay: 'rgba(10,11,13,0.4)',
    inputBg: neutrals[0],
    cardBg: neutrals[50],
    skeleton: neutrals[200],
  };

  const dark: AppThemeColors = {
    background: neutrals[950],
    surface: neutrals[900],
    surfaceAlt: neutrals[850],
    border: neutrals[700],
    borderLight: neutrals[800],
    text: neutrals[50],
    textSecondary: neutrals[400],
    textTertiary: neutrals[500],
    textMuted: neutrals[600],
    primary: brand.primary,
    primarySoft: hexToRgba(brand.primary, 0.22),
    accent: brand.accent,
    accentSoft: hexToRgba(brand.accent, 0.22),
    success: semantic.success.dark,
    danger: semantic.danger.dark,
    warning: semantic.warning.dark,
    info: semantic.info.dark,
    overlay: 'rgba(0,0,0,0.7)',
    inputBg: neutrals[850],
    cardBg: neutrals[900],
    skeleton: neutrals[800],
  };

  return { light, dark };
}

export type AppTheme = ReturnType<typeof createAppTheme>;
export type ThemeColors = AppTheme['light'];

// ---------------------------------------------------------------------------
// Colores de marca por app — la única diferencia real entre productos.
// Cada valor viene de `hues`, nunca un hex suelto — así no se puede
// colar un "casi-amarillo" o "casi-morado" nuevo por accidente.
// ---------------------------------------------------------------------------
export const brands = {
  varo: { primary: hues.green, accent: hues.azure }, // finanzas
  vaultgaming: { primary: hues.red, accent: hues.amber }, // backlog de juegos / ofertas — antes crimson propio (#EF4360), ahora el mismo rojo que danger
  vaulta: { primary: hues.teal, accent: hues.purple }, // fotos
  vellum: { primary: hues.slateBlue, accent: hues.amber }, // lector — antes usaba un dorado propio (#D9A441)
  veya: { primary: hues.purple, accent: hues.teal }, // pelis/series/anime — antes usaba su propio morado/teal
  velody: { primary: hues.blue, accent: hues.purple }, // música — auditado 2026-08-11: el color real en uso es un degradado azul→morado (título, CTAs), no naranja/ámbar como se documentó antes sin auditar el código
} as const satisfies Record<string, BrandAccent>;

/**
 * Colores Semánticos del Design System
 *
 * Estos colores se mapean a las CSS variables de shadcn/ui (definidas en globals.css).
 * Aquí se documentan como referencia y se proveen helpers para uso programático.
 *
 * Los colores reales se definen en CSS variables (--primary, --secondary, etc.)
 * y se aplican vía Tailwind (bg-primary, text-primary-foreground, etc.)
 */

/** Mapeo de colores semánticos a clases Tailwind */
export const colors = {
  // ─── Primarios ─────────────────────────────────────
  primary: {
    bg: 'bg-primary',
    text: 'text-primary',
    foreground: 'text-primary-foreground',
    border: 'border-primary',
  },
  secondary: {
    bg: 'bg-secondary',
    text: 'text-secondary',
    foreground: 'text-secondary-foreground',
    border: 'border-secondary',
  },
  destructive: {
    bg: 'bg-destructive',
    text: 'text-destructive',
    foreground: 'text-destructive-foreground',
    border: 'border-destructive',
  },
  muted: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    foreground: 'text-muted-foreground',
    border: 'border-muted',
  },
  accent: {
    bg: 'bg-accent',
    text: 'text-accent-foreground',
    foreground: 'text-accent-foreground',
    border: 'border-accent',
  },

  // ─── Superficies ───────────────────────────────────
  card: {
    bg: 'bg-card',
    text: 'text-card-foreground',
    foreground: 'text-card-foreground',
    border: 'border-border',
  },
  background: {
    bg: 'bg-background',
    text: 'text-foreground',
    foreground: 'text-foreground',
    border: 'border-border',
  },

  // ─── Estados (custom) ─────────────────────────────
  success: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-400',
    foreground: 'text-emerald-800 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-400',
    foreground: 'text-amber-800 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-400',
    foreground: 'text-blue-800 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
} as const;

/** Tipo para las variantes de color disponibles */
export type ColorVariant = keyof typeof colors;

/**
 * Colores de acento por módulo de la plataforma.
 * Se usan para diferenciar visualmente cada vertical.
 */
export const moduleAccents = {
  quality: {
    accent: 'bg-blue-500',
    light: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    ring: 'ring-blue-500/20',
  },
  agro: {
    accent: 'bg-green-500',
    light: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    ring: 'ring-green-500/20',
  },
  finance: {
    accent: 'bg-amber-500',
    light: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    ring: 'ring-amber-500/20',
  },
  industry: {
    accent: 'bg-purple-500',
    light: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    ring: 'ring-purple-500/20',
  },
} as const;

export type ModuleAccent = keyof typeof moduleAccents;

/** Badge color presets for common tag types */
export const badgeColors = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  green:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  purple:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  indigo:
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  orange:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
} as const;

export type BadgeColor = keyof typeof badgeColors;

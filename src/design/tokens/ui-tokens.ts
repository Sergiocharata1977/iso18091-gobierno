export const uiRadii = {
  xs: '0.375rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.75rem',
  pill: '999px',
} as const;

export const uiSpacing = {
  xxs: '0.25rem',
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

const corePalette = {
  emerald: {
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    700: '#334155',
    900: '#0f172a',
  },
  blue: {
    500: '#2563eb',
  },
  amber: {
    500: '#d97706',
  },
  red: {
    500: '#dc2626',
    400: '#f87171',
  },
} as const;

export const uiThemes = {
  light: {
    surface: {
      canvas: '#f8fafc',
      default: '#ffffff',
      muted: '#f8fafc',
      subtle: '#f1f5f9',
      elevated: '#ffffff',
      inverse: '#0f172a',
      sunken: '#eef2f7',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      muted: '#64748b',
      inverse: '#f8fafc',
    },
    border: {
      default: '#e2e8f0',
      subtle: '#f1f5f9',
      strong: '#cbd5e1',
      inverse: 'rgba(15, 23, 42, 0.14)',
    },
    action: {
      primary: corePalette.emerald[500],
      primaryHover: corePalette.emerald[600],
      primaryForeground: '#f8fafc',
      primarySoft: '#ecfdf5',
      secondary: '#f1f5f9',
      secondaryHover: '#e2e8f0',
      secondaryForeground: '#0f172a',
      accent: '#eefbf6',
      accentForeground: '#065f46',
    },
    status: {
      success: corePalette.emerald[600],
      successSurface: '#ecfdf5',
      successForeground: '#065f46',
      warning: corePalette.amber[500],
      warningSurface: '#fffbeb',
      warningForeground: '#92400e',
      danger: corePalette.red[500],
      dangerSurface: '#fef2f2',
      dangerForeground: '#991b1b',
      neutral: '#0f172a',
      neutralSurface: '#f8fafc',
      neutralForeground: '#334155',
      info: corePalette.blue[500],
      infoSurface: '#eff6ff',
      infoForeground: '#1d4ed8',
    },
    interactive: {
      ring: 'rgba(16, 185, 129, 0.35)',
      overlay: 'rgba(15, 23, 42, 0.04)',
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.82)',
      border: 'rgba(16, 185, 129, 0.18)',
      blur: '16px',
    },
    shadow: {
      xs: '0 1px 2px rgba(15, 23, 42, 0.06)',
      sm: '0 8px 20px rgba(15, 23, 42, 0.08)',
      md: '0 16px 40px rgba(15, 23, 42, 0.12)',
      glow: '0 0 0 1px rgba(16, 185, 129, 0.12), 0 18px 40px rgba(16, 185, 129, 0.16)',
      inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
    },
    sidebar: {
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#64748b',
      hover: '#f1f5f9',
      active: 'rgba(16, 185, 129, 0.14)',
      activeForeground: '#047857',
    },
    charts: ['#f97316', '#0d9488', '#3b82f6', '#a3e635', '#eab308'],
  },
  dark: {
    surface: {
      canvas: '#030712',
      default: '#0d1f35',
      muted: '#0a1628',
      subtle: '#0f2744',
      elevated: '#12314f',
      inverse: '#f8fafc',
      sunken: '#091423',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
      inverse: '#0f172a',
    },
    border: {
      default: '#1e3a5f',
      subtle: '#17304e',
      strong: '#2a4d74',
      inverse: 'rgba(248, 250, 252, 0.16)',
    },
    action: {
      primary: corePalette.emerald[400],
      primaryHover: corePalette.emerald[300],
      primaryForeground: '#032018',
      primarySoft: 'rgba(16, 185, 129, 0.14)',
      secondary: '#0f2744',
      secondaryHover: '#12314f',
      secondaryForeground: '#f8fafc',
      accent: '#10243d',
      accentForeground: '#f8fafc',
    },
    status: {
      success: corePalette.emerald[400],
      successSurface: 'rgba(16, 185, 129, 0.14)',
      successForeground: '#d1fae5',
      warning: '#f59e0b',
      warningSurface: 'rgba(245, 158, 11, 0.14)',
      warningForeground: '#fde68a',
      danger: corePalette.red[400],
      dangerSurface: 'rgba(248, 113, 113, 0.16)',
      dangerForeground: '#fecaca',
      neutral: '#e2e8f0',
      neutralSurface: '#0a1628',
      neutralForeground: '#cbd5e1',
      info: '#60a5fa',
      infoSurface: 'rgba(96, 165, 250, 0.16)',
      infoForeground: '#dbeafe',
    },
    interactive: {
      ring: 'rgba(52, 211, 153, 0.42)',
      overlay: 'rgba(255, 255, 255, 0.06)',
    },
    glass: {
      background: 'rgba(10, 22, 40, 0.82)',
      border: 'rgba(16, 185, 129, 0.2)',
      blur: '16px',
    },
    shadow: {
      xs: '0 1px 2px rgba(2, 6, 23, 0.36)',
      sm: '0 12px 28px rgba(2, 6, 23, 0.34)',
      md: '0 22px 52px rgba(2, 6, 23, 0.44)',
      glow: '0 0 0 1px rgba(52, 211, 153, 0.16), 0 18px 40px rgba(16, 185, 129, 0.22)',
      inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    },
    sidebar: {
      background: '#0a1628',
      foreground: '#f8fafc',
      muted: '#94a3b8',
      hover: '#10243d',
      active: 'rgba(16, 185, 129, 0.18)',
      activeForeground: '#6ee7b7',
    },
    charts: ['#6366f1', '#10b981', '#eab308', '#a855f7', '#ef4444'],
  },
} as const;

export const uiShadows = {
  light: uiThemes.light.shadow,
  dark: uiThemes.dark.shadow,
} as const;

export const uiTokens = {
  colors: corePalette,
  radii: uiRadii,
  spacing: uiSpacing,
  shadows: uiShadows,
  themes: uiThemes,
} as const;

export type UIThemeName = keyof typeof uiThemes;

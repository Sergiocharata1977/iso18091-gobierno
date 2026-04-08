import { uiMotion } from '@/design/tokens/ui-motion';
import { uiRadii, uiSpacing, uiThemes } from '@/design/tokens/ui-tokens';

const createTheme = (
  theme: (typeof uiThemes)[keyof typeof uiThemes],
  mode: 'light' | 'dark'
) => ({
  mode,
  background: {
    primary: theme.surface.default,
    secondary: theme.surface.muted,
    tertiary: theme.surface.subtle,
    canvas: theme.surface.canvas,
    elevated: theme.surface.elevated,
    gradient:
      mode === 'light'
        ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
        : 'linear-gradient(180deg, #030712 0%, #0a1628 100%)',
  },
  foreground: {
    primary: theme.text.primary,
    secondary: theme.text.secondary,
    muted: theme.text.muted,
    inverse: theme.text.inverse,
  },
  colors: {
    primary: theme.action.primary,
    primaryHover: theme.action.primaryHover,
    primarySoft: theme.action.primarySoft,
    secondary: theme.action.secondary,
    secondaryHover: theme.action.secondaryHover,
    accent: theme.action.accent,
    border: theme.border.default,
    borderStrong: theme.border.strong,
    borderLight: theme.border.subtle,
  },
  status: theme.status,
  glassmorphism: {
    background: theme.glass.background,
    border: theme.glass.border,
    blur: theme.glass.blur,
  },
  radii: uiRadii,
  spacing: uiSpacing,
  motion: uiMotion,
  shadow: theme.shadow,
});

export const lightTheme = createTheme(uiThemes.light, 'light');

export const darkTheme = createTheme(uiThemes.dark, 'dark');

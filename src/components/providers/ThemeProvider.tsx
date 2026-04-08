'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

function isForcedLightPath(pathname: string | null): boolean {
  return pathname === '/';
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'theme',
}: ThemeProviderProps) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
    const initialTheme =
      storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
        ? storedTheme
        : defaultTheme;

    setThemeState(initialTheme);
    setResolvedTheme(resolveTheme(initialTheme));
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    const nextResolvedTheme = isForcedLightPath(pathname)
      ? 'light'
      : resolveTheme(theme);

    root.classList.toggle('dark', nextResolvedTheme === 'dark');
    root.style.colorScheme = nextResolvedTheme;

    setResolvedTheme(nextResolvedTheme);
    if (!isForcedLightPath(pathname)) {
      window.localStorage.setItem(storageKey, theme);
    }
  }, [pathname, theme, storageKey]);

  useEffect(() => {
    if (isForcedLightPath(pathname)) {
      return;
    }

    const mediaQuery = window.matchMedia(MEDIA_QUERY);

    const handleChange = () => {
      if (theme !== 'system') {
        return;
      }

      const nextResolvedTheme = getSystemTheme();
      window.document.documentElement.classList.toggle(
        'dark',
        nextResolvedTheme === 'dark'
      );
      window.document.documentElement.style.colorScheme = nextResolvedTheme;
      setResolvedTheme(nextResolvedTheme);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [pathname, theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: setThemeState,
    }),
    [resolvedTheme, theme]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

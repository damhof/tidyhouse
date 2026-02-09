'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
const ThemeContext = createContext<{ theme: Theme; resolvedTheme: 'light' | 'dark'; setTheme: (t: Theme) => void }>({
  theme: 'system', resolvedTheme: 'light', setTheme: () => {}
});

export function useTheme() { return useContext(ThemeContext); }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolved = prefersDark ? 'dark' : 'light';
      root.classList.add(resolved);
      setResolvedTheme(resolved);
    } else {
      root.classList.add(t);
      setResolvedTheme(t);
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('tidyhouse_theme', t);
    applyTheme(t);
  }, [applyTheme]);

  useEffect(() => {
    const saved = localStorage.getItem('tidyhouse_theme') as Theme | null;
    if (saved) {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      applyTheme('system');
    }
  }, [applyTheme]);

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

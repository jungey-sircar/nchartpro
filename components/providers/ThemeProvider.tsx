'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'app-default' | 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'app-default',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('app-default');

  useEffect(() => {
    const saved = localStorage.getItem('nchart-theme') as Theme | null;
    if (saved && ['app-default', 'dark', 'light'].includes(saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('nchart-theme', t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Theme = "dark" | "light";

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  const handleSetTheme = useCallback((newTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    try {
      localStorage.setItem('pageos-theme', newTheme);
    } catch (error) {
      console.warn(`Error setting theme in localStorage: ${error}`);
    }
    setTheme(newTheme);
  }, []);
  
  useEffect(() => {
    try {
        const storedTheme = localStorage.getItem('pageos-theme') as Theme | null;
        if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
            handleSetTheme(storedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            handleSetTheme(prefersDark ? 'dark' : 'light');
        }
    } catch (error) {
        console.warn(`Error reading theme from localStorage: ${error}`);
        handleSetTheme('dark');
    }
  }, [handleSetTheme]);


  const value = {
    theme,
    setTheme: handleSetTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

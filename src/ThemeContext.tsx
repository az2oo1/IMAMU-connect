import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  hue: number;
  setHue: (hue: number) => void;
  colorPreset: string;
  setColorPreset: (preset: string) => void;
  navOrder: string[];
  setNavOrder: (order: string[]) => void;
  hiddenNavItems: string[];
  setHiddenNavItems: (items: string[]) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_NAV_ORDER = ['/news', '/clubs', '/map', '/academics', '/explore', '/groups', '/calendar'];
const DEFAULT_HIDDEN_NAV = ['/map', '/explore', '/calendar'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [hue, setHue] = useState<number>(() => {
    const saved = localStorage.getItem('theme_hue');
    return saved ? parseInt(saved, 10) : 250;
  });
  const [colorPreset, setColorPreset] = useState<string>(() => {
    return localStorage.getItem('theme_preset') || 'custom';
  });
  const [navOrder, setNavOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('nav_order');
    return saved ? JSON.parse(saved) || DEFAULT_NAV_ORDER : DEFAULT_NAV_ORDER;
  });
  const [hiddenNavItems, setHiddenNavItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('hidden_nav');
    return saved ? JSON.parse(saved) || DEFAULT_HIDDEN_NAV : DEFAULT_HIDDEN_NAV;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-preset', colorPreset);
    
    if (colorPreset === 'custom') {
      root.style.setProperty('--theme-h', hue.toString());
      root.style.setProperty('--theme-s', '80%');
      root.style.setProperty('--theme-l', '50%');
    } else if (colorPreset === 'white') {
      root.style.setProperty('--theme-h', '0');
      root.style.setProperty('--theme-s', '0%');
      root.style.setProperty('--theme-l', '95%');
    } else if (colorPreset === 'gray') {
      root.style.setProperty('--theme-h', '0');
      root.style.setProperty('--theme-s', '0%');
      root.style.setProperty('--theme-l', '50%');
    } else if (colorPreset === 'blue') {
      root.style.setProperty('--theme-h', '210');
      root.style.setProperty('--theme-s', '100%');
      root.style.setProperty('--theme-l', '50%');
    } else if (colorPreset === 'emerald') {
      root.style.setProperty('--theme-h', '150');
      root.style.setProperty('--theme-s', '80%');
      root.style.setProperty('--theme-l', '40%');
    }

    localStorage.setItem('theme_hue', hue.toString());
    localStorage.setItem('theme_preset', colorPreset);
  }, [hue, colorPreset]);

  useEffect(() => {
    localStorage.setItem('nav_order', JSON.stringify(navOrder));
  }, [navOrder]);

  useEffect(() => {
    localStorage.setItem('hidden_nav', JSON.stringify(hiddenNavItems));
  }, [hiddenNavItems]);

  return (
    <ThemeContext.Provider value={{ hue, setHue, colorPreset, setColorPreset, navOrder, setNavOrder, hiddenNavItems, setHiddenNavItems }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

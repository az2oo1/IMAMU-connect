import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 
  | 'indigo' 
  | 'blue' 
  | 'cyan' 
  | 'teal' 
  | 'emerald' 
  | 'green' 
  | 'lime' 
  | 'yellow' 
  | 'amber' 
  | 'orange' 
  | 'red' 
  | 'rose' 
  | 'pink' 
  | 'fuchsia' 
  | 'purple' 
  | 'violet';

type Radius = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type AppFont = 'inter' | 'roboto' | 'poppins' | 'playfair' | 'mono';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  radius: Radius;
  setRadius: (radius: Radius) => void;
  font: AppFont;
  setFont: (font: AppFont) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('indigo');
  const [radius, setRadius] = useState<Radius>('md');
  const [font, setFont] = useState<AppFont>('inter');

  useEffect(() => {
    const root = document.documentElement;
    const allThemes = [
      'theme-indigo', 'theme-blue', 'theme-cyan', 'theme-teal', 'theme-emerald', 
      'theme-green', 'theme-lime', 'theme-yellow', 'theme-amber', 'theme-orange', 
      'theme-red', 'theme-rose', 'theme-pink', 'theme-fuchsia', 'theme-purple', 'theme-violet'
    ];
    root.classList.remove(...allThemes);
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const allRadii = ['radius-none', 'radius-sm', 'radius-md', 'radius-lg', 'radius-xl'];
    root.classList.remove(...allRadii);
    root.classList.add(`radius-${radius}`);
  }, [radius]);

  useEffect(() => {
    const root = document.documentElement;
    const allFonts = ['font-inter', 'font-roboto', 'font-poppins', 'font-playfair', 'font-mono'];
    root.classList.remove(...allFonts);
    root.classList.add(`font-${font}`);
  }, [font]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, radius, setRadius, font, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

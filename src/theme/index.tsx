import { createContext, useContext, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { usePreferences } from '../store/preferences';
const light = {
  background: '#F7F8F5',
  surface: '#FFFFFF',
  elevated: '#EDF2ED',
  primary: '#155E4B',
  secondary: '#6C8B78',
  accent: '#C8A96B',
  text: '#172B25',
  muted: '#596D62',
  border: '#E2E8E0',
  hero: '#155E4B',
  heroText: '#FFFFFF',
  heroMuted: '#D3E5DA',
  error: '#9B3636',
};
const dark: typeof light = {
  background: '#0C1714',
  surface: '#162520',
  elevated: '#1D3029',
  primary: '#79B59B',
  secondary: '#A3B4AA',
  accent: '#D7BE89',
  text: '#F5F6F2',
  muted: '#A3B4AA',
  border: '#30453B',
  hero: '#1D4436',
  heroText: '#F5F6F2',
  heroMuted: '#D3E5DA',
  error: '#F0A8A0',
};
export const tokens = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 12, md: 20, lg: 28 },
  font: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
  },
};
export type Theme = { colors: typeof light; dark: boolean };
const ThemeContext = createContext<Theme>({ colors: light, dark: false });
export function ThemeProvider({ children }: PropsWithChildren) {
  const preference = usePreferences((s) => s.theme);
  const system = useColorScheme();
  const isDark = preference === 'dark' || (preference === 'system' && system === 'dark');
  return (
    <ThemeContext.Provider value={{ colors: isDark ? dark : light, dark: isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);

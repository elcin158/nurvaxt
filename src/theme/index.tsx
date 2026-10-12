import { createContext, useContext, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { usePreferences } from '../store/preferences';
const light = {
  background: '#F5F7FC',
  surface: '#FFFFFF',
  elevated: '#F1F4F9',
  selected: '#EDF3FF',
  selectedBorder: '#DDE6F8',
  selectedText: '#244FC3',
  selectedIcon: '#DEE8FC',
  pressed: '#E5ECFA',
  warningSurface: '#FFF6E8',
  warningBorder: '#EED7AD',
  warningText: '#86570C',
  primary: '#2D5CE3',
  onPrimary: '#FFFFFF',
  secondary: '#66718D',
  accent: '#A8D3FF',
  text: '#17243B',
  muted: '#64718B',
  border: '#E2E7F1',
  hero: '#0744BE',
  heroStart: '#0861D2',
  heroEnd: '#081F78',
  heroText: '#FFFFFF',
  heroMuted: '#E4EEFF',
  shadow: '#123D89',
  error: '#9B3636',
};
const dark: typeof light = {
  background: '#0B1120',
  surface: '#141D30',
  elevated: '#1B263B',
  selected: '#22304A',
  selectedBorder: '#33435F',
  selectedText: '#BCCAFF',
  selectedIcon: '#2C3C62',
  pressed: '#2A3959',
  warningSurface: '#2C2419',
  warningBorder: '#5D492C',
  warningText: '#F4CE8E',
  primary: '#9BB6FF',
  onPrimary: '#14244A',
  secondary: '#95A6C7',
  accent: '#BEDBFF',
  text: '#F2F5FC',
  muted: '#A7B2C8',
  border: '#2C374E',
  hero: '#123D9B',
  heroStart: '#0963CB',
  heroEnd: '#101D55',
  heroText: '#FFFFFF',
  heroMuted: '#E4EEFF',
  shadow: '#000819',
  error: '#F0A8A0',
};
export const tokens = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 14, md: 24, lg: 32 },
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

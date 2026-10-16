import { useEffect, useState } from 'react';
import { AppState, ActivityIndicator, View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../src/theme';
import { usePreferences } from '../src/store/preferences';
import { getDatabase } from '../src/database/repository';
import {
  promptExactAccessOnce,
  requestReconciliation,
} from '../src/features/notifications/service';
import { AppText, Button } from '../src/components/ui';
void SplashScreen.preventAutoHideAsync();
const client = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
function Shell() {
  const { colors, dark } = useTheme();
  const hydrated = usePreferences((s) => s.hydrated);
  const city = usePreferences((s) => s.locationId);
  const reminders = usePreferences((s) => s.reminders);
  const timeFormat = usePreferences((s) => s.timeFormat);
  const showKerahat = usePreferences((s) => s.showKerahat);
  const kerahatDurations = usePreferences((s) => s.kerahatDurations);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    getDatabase()
      .then(() => {
        if (alive) {
          setReady(true);
          setError(false);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (ready && hydrated) void requestReconciliation();
  }, [ready, hydrated, city, reminders, timeFormat, showKerahat, kerahatDurations]);
  const remindersEnabled = reminders.enabled;
  useEffect(() => {
    if (ready && hydrated && remindersEnabled) void promptExactAccessOnce();
  }, [ready, hydrated, remindersEnabled]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active' && ready && hydrated) void requestReconciliation();
    });
    return () => listener.remove();
  }, [ready, hydrated]);
  useEffect(() => {
    if ((ready || error) && hydrated) void SplashScreen.hideAsync();
  }, [ready, error, hydrated]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {error ? (
        <View style={{ flex: 1, padding: 32, justifyContent: 'center', gap: 24 }}>
          <AppText variant="heading">Təqvim açıla bilmədi</AppText>
          <AppText>Offline məlumatların bütövlüyünü yoxlamaq mümkün olmadı.</AppText>
          <Button
            title="Yenidən yoxla"
            onPress={() => {
              setError(false);
              setAttempt((n) => n + 1);
            }}
          />
        </View>
      ) : !ready || !hydrated ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} accessibilityLabel="Təqvim hazırlanır" />
        </View>
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="cities" options={{ presentation: 'modal' }} />
          <Stack.Screen name="reminders" options={{ presentation: 'modal' }} />
        </Stack>
      )}
    </View>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  if (!loaded && !error && Platform.OS !== 'web') return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

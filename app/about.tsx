import { useState } from 'react';
import Constants from 'expo-constants';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { AppText, Card } from '../src/components/ui';
import { useTheme } from '../src/theme';
import { BrandLockup } from '../src/components/brand/Brand';
export default function About() {
  const [taps, setTaps] = useState(0);
  const { colors } = useTheme();
  return (
    <Screen
      bottomSafeArea
      header={<ScreenHeader title="NurVaxt haqqında" action="close" onBack={() => router.back()} />}
    >
      <Card>
        <Pressable
          onPress={() => {
            setTaps(taps + 1);
            if (taps >= 6) router.push('/diagnostics');
          }}
          accessibilityRole="button"
          accessibilityLabel="NurVaxt versiyası"
        >
          <BrandLockup subtitle="Hər gün, vaxtında." />
          <AppText variant="caption" style={{ color: colors.muted, marginTop: 16 }}>
            Versiya {Constants.expoConfig?.version ?? '1.0.1'}
          </AppText>
        </Pressable>
        <AppText style={{ marginTop: 24 }}>Namaz vaxtları hər zaman yanında.</AppText>
        <AppText style={{ color: colors.muted, marginTop: 16 }}>
          NurVaxt müstəqil mobil tətbiqdir. Namaz vaxtlarının mənbəyi Qafqaz Müsəlmanları İdarəsinin
          yayımladığı təqvimdir. NurVaxt QMİ-nin rəsmi tətbiqi deyil.
        </AppText>
        <AppText style={{ color: colors.muted, marginTop: 16 }}>
          Hesab, reklam və analitika yoxdur. Ayarlar və təqvim cihazınızda saxlanılır.
        </AppText>
      </Card>
    </Screen>
  );
}

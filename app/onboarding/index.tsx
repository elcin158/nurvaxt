import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Screen } from '../../src/components/layout/Screen';
import { AppText, Button, Card, Chip } from '../../src/components/ui';
import { CityButton } from '../../src/features/locations/CityButton';
import { usePreferences } from '../../src/store/preferences';
import {
  promptExactAccess,
  requestNotificationPermission,
} from '../../src/features/notifications/service';
import { useTheme } from '../../src/theme';
const pages = [
  {
    title: 'NurVaxta xoş gəldiniz',
    body: 'Namaz vaxtları hər zaman yanında. Sakit, sadə və gündəlik həyatınıza uyğun.',
  },
  {
    title: 'Şəhərinizi seçin',
    body: 'QMİ-nin dərc etdiyi vaxtlar bölgəyə görə dəyişir. Şəhərinizi sonra da dəyişə bilərsiniz.',
  },
  {
    title: 'Vaxtında xatırladaq',
    body: 'Namaz vaxtında və əvvəl bildiriş alın, qalan vaxtı izləyin. İcazə seçimdən sonra istənəcək.',
  },
  {
    title: 'Hər şey hazırdır',
    body: 'Yoxlanmış tarixlərdə təqvim internet olmadan işləyir. NurVaxt müstəqil tətbiqdir; vaxtların mənbəyi QMİ-dir.',
  },
];
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const { colors } = useTheme();
  const prefs = usePreferences();
  const page = pages[step]!;
  const finish = () => {
    prefs.set({ onboardingComplete: true });
    router.replace('/(tabs)');
  };
  async function enable() {
    setBusy(true);
    try {
      const granted = await requestNotificationPermission();
      prefs.set({ reminders: { ...usePreferences.getState().reminders, enabled: granted } });
      if (granted) await promptExactAccess();
    } catch {
      Alert.alert(
        'Bildiriş icazəsi açıla bilmədi',
        'Xatırlatmaları sonra Ayarlardan aktivləşdirə bilərsiniz.',
      );
    } finally {
      setBusy(false);
      setStep(3);
    }
  }
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="heading">NurVaxt.</AppText>
        <AppText variant="caption" style={{ color: colors.muted }}>
          {step + 1} / 4
        </AppText>
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 32 }}>
        <Svg width={160} height={180} viewBox="0 0 160 180">
          <Path
            d="M30 155V80Q30 40 80 15Q130 40 130 80V155Z"
            fill={colors.elevated}
            stroke={colors.primary}
            strokeWidth="3"
          />
          <Circle cx="80" cy="100" r="33" fill="none" stroke={colors.primary} strokeWidth="3" />
          <Path
            d="M80 79V101L97 110 M80 0V8 M148 68L140 72 M20 72L12 68"
            fill="none"
            stroke={colors.accent}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <View style={{ gap: 16 }}>
        <AppText variant="title">{page.title}</AppText>
        <AppText style={{ color: colors.muted, fontSize: 17, lineHeight: 28 }}>{page.body}</AppText>
      </View>
      {step === 1 && (
        <Card>
          <CityButton />
        </Card>
      )}
      {step === 2 && (
        <Card>
          <AppText variant="heading">Başlanğıc xatırlatması</AppText>
          <AppText style={{ marginVertical: 16, color: colors.muted }}>
            Beş gündəlik namazın vaxtında və seçdiyiniz dəqiqə əvvəl bildiriş gələcək. Ayarlarda
            tənzimləyə bilərsiniz.
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[5, 10, 15].map((offset) => (
              <Chip
                key={offset}
                title={`${offset} dəqiqə`}
                selected={prefs.reminders.offsets.fajr.includes(offset)}
                onPress={() =>
                  prefs.set({
                    reminders: {
                      ...prefs.reminders,
                      offsets: {
                        imsak: [],
                        fajr: [offset],
                        dhuhr: [offset],
                        asr: [offset],
                        maghrib: [offset],
                        isha: [offset],
                      },
                    },
                  })
                }
              />
            ))}
          </View>
        </Card>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 }}>
        {pages.map((_, index) => (
          <View
            key={index}
            style={{
              height: 6,
              width: index === step ? 24 : 6,
              borderRadius: 3,
              backgroundColor: index === step ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>
      <Button
        title={
          step === 3
            ? 'Başlayaq'
            : step === 2
              ? busy
                ? 'İcazə yoxlanılır…'
                : 'Bildirişləri aktivləşdir'
              : 'Davam et'
        }
        disabled={busy}
        onPress={() => {
          if (step === 3) finish();
          else if (step === 2) void enable();
          else setStep(step + 1);
        }}
      />
      {step === 2 && <Button title="Hələlik keç" secondary onPress={() => setStep(3)} />}
      {step > 0 && !busy && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setStep(step - 1)}
          style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText style={{ color: colors.muted }}>Geri</AppText>
        </Pressable>
      )}
    </Screen>
  );
}

import { useState } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { BrandBackdrop, BrandIcon, BrandLockup } from '../../src/components/brand/Brand';
import { Screen } from '../../src/components/layout/Screen';
import { AppText, Button, Card, Chip, Icon, IconButton } from '../../src/components/ui';
import { CityButton } from '../../src/features/locations/CityButton';
import { usePreferences } from '../../src/store/preferences';
import { DAILY_PRAYERS } from '../../src/constants/prayers';
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
  const toggleReminder = (offset: number) => {
    const reminders = usePreferences.getState().reminders;
    const selected = DAILY_PRAYERS.every((prayer) => reminders.offsets[prayer].includes(offset));
    const offsets = { ...reminders.offsets };
    for (const prayer of DAILY_PRAYERS) {
      offsets[prayer] = selected
        ? offsets[prayer].filter((value) => value !== offset)
        : [...new Set([...offsets[prayer], offset])].sort((a, b) => a - b);
    }
    prefs.set({ reminders: { ...reminders, offsets } });
  };
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
    <Screen
      bottomSafeArea
      header={
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {step > 0 && (
            <IconButton
              name="chevron-back"
              label="Geri"
              disabled={busy}
              onPress={() => setStep(step - 1)}
            />
          )}
          <BrandLockup />
          <AppText variant="caption" style={{ color: colors.muted }}>
            {step + 1} / 4
          </AppText>
        </View>
      }
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 40,
          minHeight: 252,
          borderRadius: 32,
          overflow: 'hidden',
          gap: 20,
        }}
      >
        <BrandBackdrop />
        {step === 0 ? (
          <BrandIcon size={120} />
        ) : (
          <View
            style={{
              width: 104,
              height: 104,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF18',
              borderColor: '#FFFFFF40',
              borderWidth: 1,
              borderRadius: 32,
            }}
          >
            <Icon
              name={
                step === 1
                  ? 'location-outline'
                  : step === 2
                    ? 'notifications-outline'
                    : 'checkmark-circle-outline'
              }
              size={52}
              color="#FFFFFF"
            />
          </View>
        )}
        <AppText variant="caption" style={{ color: colors.heroMuted, letterSpacing: 1.5 }}>
          HƏR GÜN, VAXTINDA.
        </AppText>
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
          <AppText variant="heading">Başlanğıc xatırlatmaları</AppText>
          <AppText style={{ marginVertical: 16, color: colors.muted }}>
            5, 10 və 15 dəqiqəni birlikdə seçə bilərsiniz. Beş gündəlik namazın vaxtında və
            seçdiyiniz hər vaxtda əvvəlcədən bildiriş gələcək. Ayarlarda tənzimləyə bilərsiniz.
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[5, 10, 15].map((offset) => (
              <Chip
                key={offset}
                title={`${offset} dəqiqə`}
                selected={DAILY_PRAYERS.every((prayer) =>
                  prefs.reminders.offsets[prayer].includes(offset),
                )}
                onPress={() => toggleReminder(offset)}
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
    </Screen>
  );
}

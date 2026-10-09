import { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Screen } from '../../src/components/layout/Screen';
import { AppText, EmptyState, IconButton } from '../../src/components/ui';
import { CityButton } from '../../src/features/locations/CityButton';
import { NextPrayerCard } from '../../src/features/prayer-times/NextPrayerCard';
import { PrayerList } from '../../src/features/prayer-times/PrayerList';
import { usePrayerDays } from '../../src/hooks/usePrayerDays';
import { useToday } from '../../src/hooks/useToday';
import { formatDate, hijriDate, shiftDate } from '../../src/utils/time';
import { usePreferences } from '../../src/store/preferences';
import { useTheme } from '../../src/theme';
import type { PrayerField } from '../../src/constants/prayers';
export default function Home() {
  const today = useToday();
  const [date, setDate] = useState(today);
  const [followToday, setFollowToday] = useState(true);
  const [upcoming, setUpcoming] = useState<{ field?: PrayerField; date?: string }>({});
  const onChange = useCallback(
    (field?: PrayerField, eventDate?: string) => setUpcoming({ field, date: eventDate }),
    [],
  );
  const { data, isPending, isError } = usePrayerDays(date);
  const day = data?.[0];
  const { colors } = useTheme();
  const showHijri = usePreferences((s) => s.showHijri);
  const adjustment = usePreferences((s) => s.hijriAdjustment);
  useEffect(() => {
    if (followToday) setDate(today);
  }, [today, followToday]);
  const navigate = (offset: number) => {
    setFollowToday(false);
    setDate(shiftDate(date, offset));
  };
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <AppText variant="title">
            NurVaxt
            <AppText variant="title" style={{ color: colors.accent }}>
              .
            </AppText>
          </AppText>
          <CityButton />
        </View>
        <IconButton
          name="options-outline"
          label="Ayarları aç"
          onPress={() => router.push('/(tabs)/settings')}
        />
      </View>
      <Animated.View entering={FadeIn.duration(350).reduceMotion(ReduceMotion.System)}>
        <NextPrayerCard onPrayerChange={onChange} />
      </Animated.View>
      <View style={{ gap: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <IconButton name="chevron-back" label="Əvvəlki gün" onPress={() => navigate(-1)} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText
              variant="heading"
              onPress={() => {
                setDate(today);
                setFollowToday(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Bu günə qayıt"
              style={{ paddingVertical: 8 }}
            >
              {date === today ? 'Bu gün' : 'Namaz vaxtları'}
            </AppText>
          </View>
          <IconButton name="chevron-forward" label="Növbəti gün" onPress={() => navigate(1)} />
        </View>
        <AppText variant="caption" style={{ textAlign: 'center', color: colors.muted }}>
          {formatDate(date)}
        </AppText>
        {showHijri && (
          <AppText variant="caption" style={{ textAlign: 'center', color: colors.muted }}>
            {hijriDate(date, adjustment)} · hesablanmış tarix
          </AppText>
        )}
        {isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : day ? (
          <PrayerList day={day} upcoming={upcoming.date === date ? upcoming.field : undefined} />
        ) : (
          <EmptyState error={isError} />
        )}
      </View>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <AppText variant="caption" style={{ color: colors.muted }}>
          Mənbə: Qafqaz Müsəlmanları İdarəsi
        </AppText>
        <AppText variant="caption" style={{ color: colors.muted, textAlign: 'center' }}>
          NurVaxt müstəqil tətbiqdir.
        </AppText>
      </View>
    </Screen>
  );
}

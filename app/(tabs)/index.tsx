import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/layout/Screen';
import { AppText, EmptyState, Icon } from '../../src/components/ui';
import { BrandLockup } from '../../src/components/brand/Brand';
import { CityButton } from '../../src/features/locations/CityButton';
import { NextPrayerCard } from '../../src/features/prayer-times/NextPrayerCard';
import { PrayerList } from '../../src/features/prayer-times/PrayerList';
import { PrayerTimesShareButton } from '../../src/features/prayer-times/PrayerTimesShareButton';
import { KerahatTimesCard } from '../../src/features/prayer-times/KerahatTimesCard';
import { usePrayerDays } from '../../src/hooks/usePrayerDays';
import { useToday } from '../../src/hooks/useToday';
import { formatDate, hijriDate, shiftDate } from '../../src/utils/time';
import { usePreferences } from '../../src/store/preferences';
import { tokens, useTheme } from '../../src/theme';
import type { PrayerField } from '../../src/constants/prayers';
import type { PrayerOccurrence } from '../../src/features/prayer-times/domain';

export default function Home() {
  const today = useToday();
  const [selectedDate, setSelectedDate] = useState<string>();
  const [upcoming, setUpcoming] = useState<{
    field?: PrayerField;
    date?: string;
    phase?: PrayerOccurrence['phase'];
  }>({});
  const onChange = useCallback(
    (field?: PrayerField, eventDate?: string, phase?: PrayerOccurrence['phase']) =>
      setUpcoming({ field, date: eventDate, phase }),
    [],
  );
  const date = selectedDate ?? upcoming.date ?? today;
  const { data, isPending, isError } = usePrayerDays(date);
  const day = data?.[0];
  const { colors } = useTheme();
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 52 + Math.max(insets.bottom, 8) + Math.max(0, fontScale - 1) * 24;
  const compact = fontScale <= 1.15 && height - insets.top - tabBarHeight < 780;
  const showHijri = usePreferences((s) => s.showHijri);
  const showKerahat = usePreferences((s) => s.showKerahat);
  const adjustment = usePreferences((s) => s.hijriAdjustment);
  const navigate = (offset: number) => {
    setSelectedDate(shiftDate(date, offset));
  };
  return (
    <Screen
      contentStyle={{
        paddingHorizontal: 18,
        paddingTop: compact ? 6 : 10,
        gap: compact ? 6 : 12,
        paddingBottom: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          columnGap: 8,
          rowGap: 6,
        }}
      >
        <BrandLockup compact />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            maxWidth: '50%',
            flexShrink: 1,
          }}
        >
          <CityButton compact />
          {day && <PrayerTimesShareButton day={day} compact />}
        </View>
      </View>
      <NextPrayerCard compact={compact} onPrayerChange={onChange} />
      <View style={{ gap: compact ? 2 : 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Əvvəlki gün"
            onPress={() => navigate(-1)}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              backgroundColor: pressed ? colors.pressed : 'transparent',
            })}
          >
            <Icon name="chevron-back" size={18} color={colors.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${formatDate(date)}. Növbəti namazın gününə qayıt`}
            onPress={() => setSelectedDate(undefined)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
            }}
          >
            <AppText
              variant="caption"
              style={{ textAlign: 'center', fontFamily: tokens.font.semibold }}
            >
              {date === today ? 'Bu gün · ' : date === shiftDate(today, 1) ? 'Sabah · ' : ''}
              {formatDate(date).split(',')[0]}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Növbəti gün"
            onPress={() => navigate(1)}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              backgroundColor: pressed ? colors.pressed : 'transparent',
            })}
          >
            <Icon name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </View>
        {showHijri && (
          <AppText variant="caption" style={{ textAlign: 'center', color: colors.muted }}>
            {hijriDate(date, adjustment)} · hesablanmış tarix
          </AppText>
        )}
        {isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : day ? (
          <PrayerList
            day={day}
            showShare={false}
            upcoming={upcoming.date === date ? upcoming.field : undefined}
            ending={upcoming.phase === 'end'}
          />
        ) : (
          <EmptyState error={isError} />
        )}
      </View>
      {showKerahat && <KerahatTimesCard compact date={date} />}
      <View style={{ gap: 2, alignItems: 'center' }}>
        <AppText
          variant="caption"
          style={{ fontSize: 11, lineHeight: 17, color: colors.muted, textAlign: 'center' }}
        >
          Mənbə: Qafqaz Müsəlmanları İdarəsi
        </AppText>
        <AppText
          variant="caption"
          style={{ fontSize: 11, lineHeight: 17, color: colors.muted, textAlign: 'center' }}
        >
          NurVaxt müstəqil tətbiqdir.
        </AppText>
      </View>
    </Screen>
  );
}

import { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Screen } from '../../src/components/layout/Screen';
import { AppText, EmptyState, Icon } from '../../src/components/ui';
import { BrandLockup } from '../../src/components/brand/Brand';
import { CityButton } from '../../src/features/locations/CityButton';
import { NextPrayerCard } from '../../src/features/prayer-times/NextPrayerCard';
import { PrayerList } from '../../src/features/prayer-times/PrayerList';
import { PrayerTimeSheet } from '../../src/features/prayer-times/PrayerTimeSheet';
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
  const [date, setDate] = useState(today);
  const [followToday, setFollowToday] = useState(true);
  const [selectedField, setSelectedField] = useState<PrayerField | null>(null);
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
  const { data, isPending, isError } = usePrayerDays(date);
  const day = data?.[0];
  const { colors } = useTheme();
  const city = usePreferences((s) => s.locationId);
  const showHijri = usePreferences((s) => s.showHijri);
  const showKerahat = usePreferences((s) => s.showKerahat);
  const adjustment = usePreferences((s) => s.hijriAdjustment);
  useEffect(() => {
    if (followToday) setDate(today);
  }, [today, followToday]);
  useEffect(() => {
    setSelectedField(null);
  }, [date, city]);
  const navigate = (offset: number) => {
    setFollowToday(false);
    setDate(shiftDate(date, offset));
  };
  return (
    <>
      <Screen contentStyle={{ paddingHorizontal: 16, paddingTop: 10, gap: 12, paddingBottom: 16 }}>
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
          <CityButton compact />
        </View>
        <NextPrayerCard onPrayerChange={onChange} />
        <View style={{ gap: 8 }}>
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
              accessibilityLabel={`${formatDate(date)}. Bu günə qayıt`}
              onPress={() => {
                setDate(today);
                setFollowToday(true);
              }}
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
                {date === today ? 'Bu gün · ' : ''}
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
              layout="grid"
              onSelect={setSelectedField}
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
      <PrayerTimeSheet day={day} field={selectedField} onClose={() => setSelectedField(null)} />
    </>
  );
}

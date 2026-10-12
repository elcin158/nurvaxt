import { useState } from 'react';
import { DateTime } from 'luxon';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Screen } from '../../src/components/layout/Screen';
import { BrandIcon } from '../../src/components/brand/Brand';
import { AppText, Card, Chip, ChoiceGroup, EmptyState, IconButton } from '../../src/components/ui';
import { CityButton } from '../../src/features/locations/CityButton';
import { useToday } from '../../src/hooks/useToday';
import { usePrayerDays } from '../../src/hooks/usePrayerDays';
import { PrayerList } from '../../src/features/prayer-times/PrayerList';
import { TIMEZONE } from '../../src/constants/prayers';
import { MONTHS } from '../../src/localization/dates';
import { formatDate } from '../../src/utils/time';
import { useTheme } from '../../src/theme';
export default function Calendar() {
  const today = useToday();
  const [month, setMonth] = useState(DateTime.fromISO(today, { zone: TIMEZONE }).startOf('month'));
  const [selected, setSelected] = useState(today);
  const [list, setList] = useState(false);
  const { colors } = useTheme();
  const { data, isPending, isError } = usePrayerDays(
    month.toISODate()!,
    month.endOf('month').toISODate()!,
  );
  const rows = data ?? [];
  const day = rows.find((r) => r.date === selected);
  const blanks = Array.from({ length: month.weekday - 1 }, () => null);
  const cells = [
    ...blanks,
    ...Array.from({ length: month.daysInMonth! }, (_, index) =>
      month.plus({ days: index }).toISODate()!,
    ),
  ];
  const move = (offset: number) => {
    const next = month.plus({ months: offset });
    setMonth(next);
    setSelected(next.toISODate()!);
  };
  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="title">Təqvim</AppText>
        </View>
        <BrandIcon size={44} />
      </View>
      <CityButton />
      <Card style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <IconButton name="chevron-back" label="Əvvəlki ay" onPress={() => move(-1)} />
          <AppText
            variant="heading"
            style={{ flex: 1, textAlign: 'center', textTransform: 'capitalize' }}
          >
            {MONTHS[month.month - 1]} {month.year}
          </AppText>
          <IconButton name="chevron-forward" label="Növbəti ay" onPress={() => move(1)} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }}>
          {['B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.', 'B.'].map((name) => (
            <View
              key={name}
              style={{ width: '14.2857%', alignItems: 'center', paddingVertical: 8 }}
            >
              <AppText variant="caption" style={{ color: colors.muted }}>
                {name}
              </AppText>
            </View>
          ))}
          {cells.map((date, index) => (
            <View
              key={date ?? `blank-${index}`}
              style={{ width: '14.2857%', alignItems: 'center' }}
            >
              {date ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDate(date)}${date === today ? ', bu gün' : ''}${rows.some((r) => r.date === date) ? ', təqvim var' : ', təqvim yoxdur'}`}
                  accessibilityState={{ selected: selected === date }}
                  onPress={() => setSelected(date)}
                  style={{
                    minHeight: 48,
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 16,
                    backgroundColor: selected === date ? colors.selected : colors.surface,
                    borderWidth: date === today ? 1 : 0,
                    borderColor: colors.selectedBorder,
                  }}
                >
                  <AppText style={{ color: selected === date ? colors.selectedText : colors.text }}>
                    {Number(date.slice(-2))}
                  </AppText>
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      marginTop: 3,
                      backgroundColor: rows.some((r) => r.date === date)
                        ? selected === date
                          ? colors.selectedText
                          : colors.primary
                        : 'transparent',
                    }}
                  />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      </Card>
      <ChoiceGroup>
        <Chip segment title="Günlük" selected={!list} onPress={() => setList(false)} />
        <Chip segment title="Aylıq siyahı" selected={list} onPress={() => setList(true)} />
      </ChoiceGroup>
      {isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : list ? (
        rows.length ? (
          rows.map((row) => (
            <View key={row.date} style={{ gap: 8 }}>
              <AppText variant="heading">{formatDate(row.date)}</AppText>
              <PrayerList day={row} />
            </View>
          ))
        ) : (
          <EmptyState error={isError} />
        )
      ) : (
        <View style={{ gap: 16 }}>
          <AppText variant="heading">{formatDate(selected)}</AppText>
          {day ? <PrayerList day={day} /> : <EmptyState error={isError} />}
        </View>
      )}
    </Screen>
  );
}

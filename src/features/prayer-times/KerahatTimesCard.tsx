import { useState } from 'react';
import { Linking, Pressable, useWindowDimensions, View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { useActiveClock } from '../../hooks/useActiveClock';
import { usePrayerDays } from '../../hooks/usePrayerDays';
import { useToday } from '../../hooks/useToday';
import { usePreferences } from '../../store/preferences';
import { tokens, useTheme } from '../../theme';
import { formatCountdown, formatTime } from '../../utils/time';
import { KERAHAT_SOURCE_URL, kerahatStatus, kerahatWindows, solarClock } from './solar';

export function KerahatTimesCard({ compact = false, date }: { compact?: boolean; date?: string }) {
  const today = useToday();
  const selectedDate = date ?? today;
  const now = useActiveClock();
  const { data, isPending } = usePrayerDays(selectedDate);
  const format = usePreferences((state) => state.timeFormat);
  const showKerahat = usePreferences((state) => state.showKerahat);
  const warnings = usePreferences((state) => state.kerahatWarnings);
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const columns = compact && width >= 320 && format === '24' && fontScale < 1.2;
  const [showInfo, setShowInfo] = useState(false);
  const day = data?.find((record) => record.date === selectedDate && record.verified);
  const windows = showKerahat ? kerahatWindows(day) : [];
  const status = kerahatStatus(windows, now, warnings);
  const highlighted = status.active ?? (status.approaching ? status.next : undefined);
  const timeRange = (start: number, end: number) =>
    `${formatTime(solarClock(start), format)}${columns ? '–' : ' – '}${formatTime(solarClock(end), format)}`;
  if (!showKerahat) return null;
  return (
    <View
      style={{
        padding: compact ? 12 : 16,
        gap: compact ? 8 : 14,
        backgroundColor: colors.surface,
        borderWidth: compact ? 0 : 1,
        borderColor: colors.border,
        borderRadius: compact ? 18 : tokens.radius.md,
      }}
    >
      <View style={{ gap: compact ? 8 : 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppText
              style={{
                fontFamily: tokens.font.semibold,
                ...(compact ? { fontSize: 13, lineHeight: 20 } : {}),
              }}
            >
              Kərahət vaxtları
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kərahət vaxtları haqqında"
            accessibilityState={{ expanded: showInfo }}
            onPress={() => setShowInfo((value) => !value)}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.pressed : colors.background,
              ...(compact
                ? {
                    marginVertical: -8,
                    marginRight: -4,
                    backgroundColor: pressed ? colors.pressed : 'transparent',
                  }
                : {}),
            })}
          >
            <Icon name="information-circle-outline" color={colors.muted} size={20} />
          </Pressable>
        </View>
        {highlighted && (
          <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`${status.active ? 'Kərahət vaxtı davam edir' : 'Kərahət vaxtı yaxınlaşır'}: ${highlighted.title}, ${timeRange(highlighted.start, highlighted.end)}.`}
            style={{
              padding: compact ? 10 : 12,
              gap: 8,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              backgroundColor: colors.warningSurface,
              borderWidth: 1,
              borderColor: colors.warningBorder,
              borderRadius: compact ? 12 : 16,
            }}
          >
            <Icon name="time-outline" color={colors.warningText} size={20} />
            <View style={{ flex: 1, minWidth: 120 }}>
              <AppText
                style={{
                  color: colors.warningText,
                  fontFamily: tokens.font.semibold,
                  ...(compact ? { fontSize: 13, lineHeight: 20 } : {}),
                }}
              >
                {status.active ? 'Kərahət vaxtıdır' : 'Kərahət yaxınlaşır'}
              </AppText>
              <AppText variant="caption" style={{ color: colors.warningText }}>
                {status.active ? 'Bitməsinə qalan vaxt' : 'Başlamasına qalan vaxt'}
              </AppText>
            </View>
            <AppText
              variant="number"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                color: colors.warningText,
                marginLeft: 'auto',
                ...(compact ? { fontSize: 21, lineHeight: 30 } : {}),
                ...(fontScale >= 1.5 ? { width: '100%', textAlign: 'right' } : {}),
              }}
            >
              {formatCountdown(status.remaining)}
            </AppText>
          </View>
        )}
        <View style={{ flexDirection: columns ? 'row' : 'column', gap: compact ? 8 : 10 }}>
          {windows.map((window) => {
            const active = status.active?.id === window.id;
            const upcoming = status.next?.id === window.id;
            const passed = now >= window.end;
            return (
              <View
                key={window.id}
                accessible
                accessibilityLabel={`${window.title} kərahəti, təxmini ${timeRange(window.start, window.end)}${active ? ', hazırda davam edir' : passed ? ', tamamlanıb' : ''}`}
                style={{
                  flexDirection: columns ? 'column' : 'row',
                  flexWrap: 'wrap',
                  alignItems: columns ? 'flex-start' : 'center',
                  gap: columns ? 3 : 8,
                  paddingHorizontal: columns ? 0 : 10,
                  paddingVertical: columns ? 2 : 8,
                  ...(columns ? { flex: 1, minWidth: 0 } : {}),
                  borderRadius: 12,
                  backgroundColor: columns
                    ? 'transparent'
                    : active
                      ? colors.warningSurface
                      : upcoming
                        ? colors.selected
                        : colors.background,
                  borderWidth: columns ? 0 : 1,
                  borderColor: active
                    ? colors.warningBorder
                    : upcoming
                      ? colors.selectedBorder
                      : 'transparent',
                }}
              >
                {!columns && (
                  <Icon
                    name={passed ? 'checkmark-circle-outline' : 'sunny-outline'}
                    color={
                      active ? colors.warningText : upcoming ? colors.selectedText : colors.muted
                    }
                    size={16}
                  />
                )}
                <AppText
                  style={{
                    ...(columns ? { fontSize: 11, lineHeight: 17 } : { flex: 1, minWidth: 90 }),
                    color: active
                      ? colors.warningText
                      : upcoming
                        ? colors.selectedText
                        : colors.text,
                  }}
                >
                  {window.title}
                </AppText>
                <AppText
                  variant="caption"
                  style={{
                    color: active
                      ? colors.warningText
                      : upcoming
                        ? colors.selectedText
                        : colors.muted,
                    fontFamily: tokens.font.semibold,
                    ...(columns ? { fontSize: 11, lineHeight: 17 } : {}),
                    ...(format === '12' || fontScale >= 1.5
                      ? { width: '100%', textAlign: 'right' }
                      : {}),
                  }}
                >
                  {timeRange(window.start, window.end)}
                </AppText>
              </View>
            );
          })}
        </View>
        {!windows.length && (
          <AppText variant="caption" style={{ color: colors.muted }}>
            {isPending ? 'Vaxtlar hazırlanır.' : 'Bu tarix üçün yoxlanmış günəş vaxtları yoxdur.'}
          </AppText>
        )}
        {showInfo && (
          <View style={{ paddingTop: 4, gap: 8 }}>
            <AppText variant="caption" style={{ color: colors.muted }}>
              Günçıxmadan sonrakı 45 dəqiqə, Zöhrdən əvvəlki 10 dəqiqə və günbatımından əvvəlki 45
              dəqiqə göstərilir. Bunlar günəşin mövqeyinə bağlı təxmini intervallardır.
            </AppText>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(KERAHAT_SOURCE_URL);
              }}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <AppText variant="caption" style={{ color: colors.selectedText }}>
                Mənbə: Diyanət · kərahət vaxtları
              </AppText>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

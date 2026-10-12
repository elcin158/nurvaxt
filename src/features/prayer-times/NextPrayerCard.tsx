import { useEffect, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { PrayerCardBackdrop } from '../../components/brand/PrayerCardBackdrop';
import { AppText, Icon } from '../../components/ui';
import { useActiveClock } from '../../hooks/useActiveClock';
import { usePrayerDays } from '../../hooks/usePrayerDays';
import { useToday } from '../../hooks/useToday';
import { LABELS, type PrayerField } from '../../constants/prayers';
import { countdown, nextPrayerCountdown, prayerUrgency, type PrayerOccurrence } from './domain';
import { formatCountdown, formatTime, shiftDate } from '../../utils/time';
import { tokens, useTheme } from '../../theme';
import { usePreferences } from '../../store/preferences';

export function NextPrayerCard({
  onPrayerChange,
}: {
  onPrayerChange: (
    field: PrayerField | undefined,
    date: string | undefined,
    phase: PrayerOccurrence['phase'] | undefined,
  ) => void;
}) {
  const now = useActiveClock();
  const today = useToday();
  const { data } = usePrayerDays(shiftDate(today, -1), shiftDate(today, 1));
  const event = nextPrayerCountdown(data ?? [], now);
  const ending = event?.phase === 'end';
  const result = countdown(event, now);
  const format = usePreferences((s) => s.timeFormat);
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.3 || (width < 360 && format === '12');
  const urgency = prayerUrgency(result.remaining);
  const statusColor =
    urgency === 'imminent' ? '#FFB5A7' : urgency === 'soon' ? '#FFD88A' : colors.heroMuted;
  const last = useRef('');
  const field = event?.field;
  const date = event?.date;
  const phase = event?.phase;
  useEffect(() => {
    const key = `${date}/${field}/${phase}`;
    if (key !== last.current) {
      last.current = key;
      onPrayerChange(field, date, phase);
    }
  }, [field, date, phase, onPrayerChange]);
  return (
    <View
      style={{
        backgroundColor: colors.hero,
        borderRadius: tokens.radius.md,
        paddingHorizontal: 16,
        paddingVertical: 15,
        overflow: 'hidden',
        gap: 10,
        borderWidth: 1,
        borderColor: '#FFFFFF1F',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <PrayerCardBackdrop />
      {event ? (
        <>
          <View
            style={{
              flexDirection: stacked ? 'column' : 'row',
              alignItems: stacked ? 'stretch' : 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View style={{ flex: stacked ? undefined : 1, gap: 3 }}>
              <AppText
                variant="caption"
                style={{
                  color: colors.heroMuted,
                  letterSpacing: 1.2,
                  fontSize: 11,
                  lineHeight: 17,
                  fontFamily: tokens.font.semibold,
                }}
              >
                {ending ? 'SÜBH NAMAZI' : 'NÖVBƏTİ NAMAZ'}
              </AppText>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  columnGap: 7,
                  rowGap: 0,
                }}
              >
                <AppText
                  style={{
                    fontSize: 22,
                    lineHeight: 31,
                    letterSpacing: -0.6,
                    fontFamily: tokens.font.bold,
                    color: colors.heroText,
                  }}
                >
                  {LABELS[event.field]}
                </AppText>
                <AppText
                  variant="number"
                  style={{ color: colors.heroMuted, fontSize: 13, lineHeight: 20 }}
                >
                  {ending ? 'Günçıxma · ' : ''}
                  {formatTime(event.time, format)}
                </AppText>
              </View>
            </View>
            <View
              accessible
              accessibilityLiveRegion="none"
              accessibilityLabel={
                ending
                  ? `Sübh namazının vaxtı günçıxmada, ${event.time} vaxtında bitir.`
                  : `${LABELS[event.field]} namazı ${event.time} vaxtındadır.`
              }
              style={{
                alignItems: stacked ? 'flex-start' : 'flex-end',
                flexShrink: 0,
                maxWidth: stacked ? '100%' : '55%',
                gap: 2,
              }}
            >
              <AppText
                variant="number"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={{
                  color: urgency === 'normal' ? colors.heroText : statusColor,
                  fontSize: stacked ? 34 : 28,
                  lineHeight: stacked ? 46 : 38,
                  letterSpacing: -0.5,
                  fontFamily: tokens.font.bold,
                }}
              >
                {formatCountdown(result.remaining)}
              </AppText>
              <AppText
                variant="caption"
                style={{
                  color: colors.heroMuted,
                  fontSize: 11,
                  lineHeight: 16,
                  textAlign: stacked ? 'left' : 'right',
                }}
              >
                {ending
                  ? 'Sübhün bitməsinə qalan vaxt'
                  : event.date !== today
                    ? 'Sabahkı namaza qalan vaxt'
                    : 'Namaza qalan vaxt'}
              </AppText>
            </View>
          </View>
          {urgency !== 'normal' && (
            <View
              accessibilityLiveRegion="polite"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon
                name={urgency === 'imminent' ? 'notifications-outline' : 'time-outline'}
                color={statusColor}
                size={14}
              />
              <AppText
                variant="caption"
                style={{ color: statusColor, fontSize: 11, lineHeight: 17 }}
              >
                {urgency === 'imminent' ? 'Son 15 dəqiqə' : 'Son 30 dəqiqə'}
              </AppText>
            </View>
          )}
          <View
            style={{
              height: 3,
              borderRadius: 999,
              backgroundColor: '#FFFFFF26',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${result.progress * 100}%`,
                minWidth: result.progress > 0 ? 3 : 0,
                height: 3,
                borderRadius: 999,
                backgroundColor: urgency === 'normal' ? colors.accent : statusColor,
              }}
            />
          </View>
        </>
      ) : (
        <View style={{ gap: 8 }}>
          <AppText variant="heading" style={{ color: colors.heroText }}>
            Vaxtlar əlavə ediləcək
          </AppText>
          <AppText style={{ color: colors.heroMuted }}>
            Növbəti namaz üçün yoxlanmış təqvim məlumatı yoxdur.
          </AppText>
        </View>
      )}
    </View>
  );
}

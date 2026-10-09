import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText, Icon } from '../../components/ui';
import { useActiveClock } from '../../hooks/useActiveClock';
import { usePrayerDays } from '../../hooks/usePrayerDays';
import { useToday } from '../../hooks/useToday';
import { LABELS, type PrayerField } from '../../constants/prayers';
import { countdown, nextPrayer, prayerUrgency } from './domain';
import { formatCountdown, formatTime, shiftDate } from '../../utils/time';
import { tokens, useTheme } from '../../theme';
import { usePreferences } from '../../store/preferences';
export function NextPrayerCard({
  onPrayerChange,
}: {
  onPrayerChange: (field: PrayerField | undefined, date: string | undefined) => void;
}) {
  const now = useActiveClock();
  const today = useToday();
  const { data } = usePrayerDays(today, shiftDate(today, 1));
  const event = nextPrayer(data ?? [], now);
  const result = countdown(event, now);
  const format = usePreferences((s) => s.timeFormat);
  const { colors } = useTheme();
  const urgency = prayerUrgency(result.remaining);
  const statusColor =
    urgency === 'imminent' ? '#FFB5A7' : urgency === 'soon' ? '#FFD88A' : colors.heroMuted;
  const last = useRef('');
  const field = event?.field;
  const date = event?.date;
  useEffect(() => {
    const key = `${date}/${field}`;
    if (key !== last.current) {
      last.current = key;
      onPrayerChange(field, date);
    }
  }, [field, date, onPrayerChange]);
  return (
    <View
      style={{
        backgroundColor: colors.hero,
        borderRadius: 28,
        padding: 24,
        overflow: 'hidden',
        gap: 24,
      }}
    >
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: -10, top: 0, opacity: 0.12 }}
      >
        <Svg width={170} height={240} viewBox="0 0 170 240">
          <Path
            d="M25 240V105Q25 50 85 20Q145 50 145 105V240 M45 240V108Q45 68 85 45Q125 68 125 108V240"
            stroke={colors.accent}
            strokeWidth="2"
            fill="none"
          />
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <AppText variant="caption" style={{ color: colors.heroMuted, letterSpacing: 1.5 }}>
          NÖVBƏTİ NAMAZ
        </AppText>
        {event && urgency !== 'normal' && (
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: '#FFFFFF14',
            }}
          >
            <Icon
              name={urgency === 'imminent' ? 'notifications-outline' : 'time-outline'}
              color={statusColor}
              size={16}
            />
            <AppText variant="caption" style={{ color: statusColor }}>
              {urgency === 'imminent' ? 'Son 15 dəqiqə' : 'Son 30 dəqiqə'}
            </AppText>
          </View>
        )}
      </View>
      {event ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <AppText
              style={{
                fontSize: 32,
                lineHeight: 44,
                fontFamily: tokens.font.bold,
                color: colors.heroText,
              }}
            >
              {LABELS[event.field]}
            </AppText>
            <AppText variant="number" style={{ color: colors.heroText, fontSize: 28 }}>
              {formatTime(event.time, format)}
            </AppText>
          </View>
          <View
            accessibilityLiveRegion="none"
            accessible
            accessibilityLabel={`${LABELS[event.field]} namazı ${event.time} vaxtındadır.`}
          >
            <AppText
              variant="number"
              style={{
                color: urgency === 'normal' ? colors.heroText : statusColor,
                fontSize: 44,
                lineHeight: 58,
                letterSpacing: 1,
              }}
            >
              {formatCountdown(result.remaining)}
            </AppText>
            <AppText variant="caption" style={{ color: colors.heroMuted }}>
              {event.date !== today ? 'Sabahkı namaza qalan vaxt' : 'Namaza qalan vaxt'}
            </AppText>
          </View>
          <View
            style={{
              height: 4,
              borderRadius: 4,
              backgroundColor: colors.secondary,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${result.progress * 100}%`,
                height: 4,
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

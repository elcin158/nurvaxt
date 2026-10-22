import { useEffect, useRef } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { PrayerCardBackdrop } from '../../components/brand/PrayerCardBackdrop';
import { AppText } from '../../components/ui';
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
  compact = false,
}: {
  compact?: boolean;
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
  const imsak = event?.field === 'imsak';
  const result = countdown(event, now);
  const format = usePreferences((s) => s.timeFormat);
  const { colors, dark } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.3 || (width < 340 && format === '12' && fontScale > 1.1);
  const dense = compact && !stacked;
  const progress = Math.max(0, Math.min(1, result.progress));
  const indicatorSize = dense ? 8 : 10;
  const trackHeight = dense ? 4 : 5;
  const prayerNameSize = dense ? (width < 360 ? 28 : 30) : 34;
  const labelFont = Platform.select({ android: 'sans-serif', ios: 'System', default: 'Arial' });
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
        backgroundColor: '#1450C1',
        borderRadius: tokens.radius.md,
        shadowColor: dark ? '#000819' : '#173A75',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: dark ? 0.2 : 0.14,
        shadowRadius: 14,
        elevation: 4,
      }}
    >
      <View
        style={{
          minHeight: dense ? 104 : 144,
          borderRadius: tokens.radius.md,
          paddingHorizontal: 16,
          paddingVertical: dense ? 10 : 16,
          overflow: 'hidden',
          gap: dense ? 8 : 14,
          borderWidth: 1,
          borderColor: dark ? '#FFFFFF1F' : '#FFFFFF33',
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
              <View style={{ flex: stacked ? undefined : 1, minWidth: 0, gap: 2 }}>
                {(ending || imsak) && (
                  <AppText
                    variant="caption"
                    style={{
                      color: colors.heroMuted,
                      letterSpacing: 0.7,
                      fontSize: dense ? 11 : 12,
                      lineHeight: dense ? 16 : 18,
                      fontFamily: labelFont,
                      fontWeight: '400',
                    }}
                  >
                    {ending ? 'SÜBH NAMAZI' : 'İMSAK VAXTI'}
                  </AppText>
                )}
                <View
                  style={{
                    alignItems: 'flex-start',
                  }}
                >
                  <AppText
                    numberOfLines={stacked ? undefined : 1}
                    adjustsFontSizeToFit={!stacked}
                    minimumFontScale={0.85}
                    style={{
                      fontSize: prayerNameSize,
                      lineHeight: dense ? 38 : 44,
                      letterSpacing: -0.6,
                      // Use one family for Azerbaijani names, including Ə, absent from Manrope.
                      fontFamily: labelFont,
                      fontWeight: '600',
                      color: colors.heroText,
                    }}
                  >
                    {LABELS[event.field]}
                  </AppText>
                  <AppText
                    variant="number"
                    style={{
                      color: colors.heroText,
                      fontSize: ending ? 16 : dense ? 20 : 22,
                      lineHeight: ending ? 24 : dense ? 28 : 30,
                      fontFamily: tokens.font.semibold,
                    }}
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
                    : imsak
                      ? `İmsak vaxtı ${event.time} vaxtındadır.`
                      : `${LABELS[event.field]} namazı ${event.time} vaxtındadır.`
                }
                style={{
                  alignItems: stacked ? 'flex-start' : 'flex-end',
                  flexShrink: 0,
                  maxWidth: stacked ? '100%' : '60%',
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
                    fontSize: dense ? (width < 360 ? 34 : 38) : 44,
                    lineHeight: dense ? 48 : 56,
                    letterSpacing: -0.8,
                    fontFamily: tokens.font.bold,
                  }}
                >
                  {formatCountdown(result.remaining)}
                </AppText>
              </View>
            </View>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={
                ending
                  ? 'Sübh vaxtının irəliləyişi'
                  : imsak
                    ? 'İmsaka doğru irəliləyiş'
                    : 'Növbəti namaza doğru irəliləyiş'
              }
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              accessibilityLiveRegion="none"
              style={{
                alignSelf: 'stretch',
                height: indicatorSize,
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  height: trackHeight,
                  borderRadius: 999,
                  backgroundColor: '#C5E9FF33',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${progress * 100}%`,
                    minWidth: progress > 0 ? trackHeight : 0,
                    height: trackHeight,
                    borderRadius: 999,
                    backgroundColor: urgency === 'normal' ? '#43DEF4' : statusColor,
                  }}
                />
              </View>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: indicatorSize / 2,
                  right: indicatorSize / 2,
                  height: indicatorSize,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: `${progress * 100}%`,
                    marginLeft: -indicatorSize / 2,
                    width: indicatorSize,
                    height: indicatorSize,
                    borderRadius: indicatorSize / 2,
                    backgroundColor: colors.heroText,
                  }}
                />
              </View>
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
    </View>
  );
}

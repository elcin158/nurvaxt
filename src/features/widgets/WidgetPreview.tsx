import type { ComponentProps } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { AppText as BaseText } from '../../components/ui';
import { crescentPath } from '../../components/brand/Brand';
import { DAILY_PRAYERS, LABELS } from '../../constants/prayers';
import type { PrayerDay } from '../../types/data';
import { formatTime } from '../../utils/time';
import { countdown, type PrayerOccurrence } from '../prayer-times/domain';
import { widgetRemaining, type WidgetVariant } from './domain';

function AppText({ style, ...props }: ComponentProps<typeof BaseText>) {
  const fontSize = StyleSheet.flatten(style)?.fontSize;
  return (
    <BaseText
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      {...props}
      style={[style, fontSize ? { lineHeight: Math.ceil(fontSize * 1.25) } : undefined]}
    />
  );
}

function Backdrop({ navy }: { navy: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      <Svg width="100%" height="100%" viewBox="0 0 340 240" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={navy ? 'widget-navy' : 'widget-blue'} x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={navy ? '#091426' : '#103782'} />
            <Stop offset="0.58" stopColor={navy ? '#112B4E' : '#0758D5'} />
            <Stop offset="1" stopColor={navy ? '#08618A' : '#04BAEB'} />
          </LinearGradient>
        </Defs>
        <Rect width="340" height="240" fill={`url(#${navy ? 'widget-navy' : 'widget-blue'})`} />
        <Path
          d="M200 -20C210 80 290 120 370 105"
          stroke="#54E7FF"
          strokeOpacity="0.2"
          strokeWidth="0.7"
          fill="none"
        />
        <Path
          d="M240 -30C260 44 300 75 372 58"
          stroke="#54E7FF"
          strokeOpacity="0.12"
          strokeWidth="0.6"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function Moon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 100 100" accessible={false}>
      <Path d={crescentPath(50, 50, 40)} fill="#DCFAFF" />
    </Svg>
  );
}

export function WidgetPreview({
  variant,
  event,
  day,
  location,
  timeFormat,
  now,
  date,
}: {
  variant: WidgetVariant;
  event: PrayerOccurrence | null;
  day: PrayerDay | undefined;
  location: string;
  timeFormat: '12' | '24';
  now: number;
  date: string;
}) {
  const small = variant === 'small';
  const compact = variant === 'compact';
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.3;
  const { progress, remaining } = countdown(event, now);
  const tomorrow = event && event.date !== day?.date;
  const white = { color: '#FFFFFF' };
  const number = { ...white, fontFamily: 'sans-serif', fontWeight: '600' as const };
  const time = event
    ? `${tomorrow ? 'Sabah · ' : ''}${formatTime(event.time, timeFormat)}`
    : 'Tətbiqi açın';
  return (
    <View
      accessibilityLabel={`${location}, ${event ? `${LABELS[event.field]}, ${time}, ${widgetRemaining(remaining)}` : 'Təqvim mövcud deyil'}`}
      style={{
        width: small ? 170 : '100%',
        minHeight: small ? 178 : compact ? 82 : 236,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#54C7EA70',
        backgroundColor: small ? '#102541' : '#0858DE',
        padding: compact ? 16 : 18,
        gap: small ? 10 : 12,
      }}
    >
      <Backdrop navy={small} />
      {compact ? (
        <View
          style={{
            flexDirection: stacked ? 'column' : 'row',
            alignItems: stacked ? 'flex-start' : 'center',
            gap: 12,
          }}
        >
          {!stacked && <Moon />}
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <AppText style={{ ...number, fontSize: event ? 24 : 17 }}>
              {event ? LABELS[event.field] : 'Təqvim yoxdur'}
            </AppText>
            <AppText style={{ ...number, fontSize: 15 }}>{time}</AppText>
          </View>
          <View style={{ alignItems: stacked ? 'flex-start' : 'flex-end', gap: 3, flexShrink: 1 }}>
            <AppText style={{ ...number, fontSize: 26 }}>
              {event ? widgetRemaining(remaining) : '—'}
            </AppText>
            <AppText variant="caption" style={{ color: '#CCE7FF' }}>
              {location}
            </AppText>
          </View>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Moon />
            {!small && <AppText style={{ ...number, fontSize: 16 }}>NurVaxt</AppText>}
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{ color: '#D0EAFF', flex: 1, textAlign: 'right' }}
            >
              {location}
            </AppText>
          </View>
          {!small && (
            <AppText variant="caption" style={{ color: '#C1DDFA', fontSize: 11 }}>
              {date}
            </AppText>
          )}
          <View
            style={{
              flexDirection: small || stacked ? 'column' : 'row',
              alignItems: small || stacked ? 'flex-start' : 'center',
              gap: 8,
              flex: 1,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ ...number, fontSize: event ? (small ? 29 : 38) : 20 }}>
                {event ? LABELS[event.field] : 'Təqvim yoxdur'}
              </AppText>
              <AppText style={{ ...number, fontSize: small ? 23 : 22 }}>{time}</AppText>
            </View>
            {!small && (
              <AppText style={{ ...number, fontSize: 30, flexShrink: 1 }}>
                {event ? widgetRemaining(remaining) : '—'}
              </AppText>
            )}
          </View>
          <View
            style={{
              height: 8,
              justifyContent: 'center',
              opacity: event?.previousTimestamp ? 1 : 0,
            }}
          >
            <View style={{ height: 4, borderRadius: 4, backgroundColor: '#7FC5FF50' }}>
              <View
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: 4,
                  backgroundColor: '#54E7FF',
                  borderRadius: 4,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: `${Math.round(progress * 100)}%`,
                  top: -2,
                  marginLeft: -4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#FFFFFF',
                }}
              />
            </View>
          </View>
          {small ? (
            <AppText style={{ ...number, fontSize: 20 }}>
              {event ? widgetRemaining(remaining) : '—'}
            </AppText>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: stacked ? 'wrap' : 'nowrap', gap: 2 }}>
              {DAILY_PRAYERS.map((field) => {
                const selected = event?.field === field && !tomorrow;
                return (
                  <View
                    key={field}
                    style={{
                      flex: stacked ? undefined : 1,
                      minWidth: stacked ? '29%' : 0,
                      alignItems: 'center',
                      paddingVertical: 7,
                      paddingHorizontal: 2,
                      gap: 4,
                      borderRadius: 10,
                      backgroundColor: selected ? '#74DCFF38' : 'transparent',
                    }}
                  >
                    <AppText style={{ color: '#E6F1FF', fontFamily: 'sans-serif', fontSize: 10 }}>
                      {LABELS[field]}
                    </AppText>
                    <AppText
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={{ ...number, fontSize: timeFormat === '12' ? 11 : 16 }}
                    >
                      {day?.[field] ? formatTime(day[field]!, timeFormat) : '—'}
                    </AppText>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

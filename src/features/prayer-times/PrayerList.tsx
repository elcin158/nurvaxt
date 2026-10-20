import { memo, useState } from 'react';
import { Platform, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '../../components/ui';
import { LABELS, PRAYER_FIELDS, type PrayerField } from '../../constants/prayers';
import type { PrayerDay } from '../../types/data';
import { usePreferences } from '../../store/preferences';
import { tokens, useTheme } from '../../theme';
import { formatTime } from '../../utils/time';
import { PrayerTimesShareButton } from './PrayerTimesShareButton';
export const PrayerList = memo(function PrayerList({
  day,
  upcoming,
  ending = false,
  showShare = true,
  fit = false,
  style,
}: {
  day: PrayerDay;
  upcoming?: PrayerField;
  ending?: boolean;
  showShare?: boolean;
  fit?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fields = usePreferences((s) => s.visibleFields);
  const format = usePreferences((s) => s.timeFormat);
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.5;
  const visible = PRAYER_FIELDS.filter((field) => fields.includes(field) && day[field]);
  const [height, setHeight] = useState(0);
  const rowHeight = fit && height > 0 ? (height - 2) / Math.max(1, visible.length) : 48;
  const baseTimeSize = format === '12' && width < 360 ? 22 : 26;
  const timeSize = fit
    ? Math.min(baseTimeSize, Math.max(18, (rowHeight - 4) / fontScale - 6))
    : baseTimeSize;
  const timeLineHeight = fit ? Math.min(32, Math.max(22, (rowHeight - 4) / fontScale)) : 32;
  const nameSize = fit ? Math.min(20, Math.max(18, (rowHeight - 4) / fontScale - 6)) : 20;
  const nameLineHeight = fit ? Math.min(28, Math.max(22, (rowHeight - 4) / fontScale)) : 28;
  return (
    <View
      onLayout={fit ? (event) => setHeight(event.nativeEvent.layout.height) : undefined}
      style={[
        {
          ...(fit ? { flex: 1, minHeight: 0 } : {}),
          backgroundColor: colors.surface,
          borderRadius: tokens.radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.025,
          shadowRadius: 12,
        },
        style,
      ]}
    >
      {visible.map((field, index) => (
        <View
          key={field}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${LABELS[field]}, ${day[field]}${upcoming === field ? (ending ? ', vaxtı davam edir' : field === 'imsak' ? ', növbəti vaxt' : ', növbəti namaz') : ''}`}
          style={{
            ...(fit ? { flex: 1, minHeight: 0 } : { minHeight: 48 }),
            flexDirection: stacked ? 'column' : 'row',
            alignItems: stacked ? 'stretch' : 'center',
            gap: stacked ? 2 : 12,
            paddingVertical: fit ? 2 : 6,
            paddingHorizontal: 16,
            backgroundColor: upcoming === field ? colors.selected : colors.surface,
          }}
        >
          <View
            style={{
              flex: stacked ? undefined : 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              columnGap: 8,
              rowGap: 2,
            }}
          >
            <AppText
              style={{
                fontSize: nameSize,
                lineHeight: nameLineHeight,
                color: upcoming === field ? colors.selectedText : colors.text,
                // Manrope lacks U+018F; use one family for the entire prayer name.
                fontFamily: Platform.select({
                  android: 'sans-serif',
                  ios: 'System',
                  default: 'Arial',
                }),
                fontWeight: '400',
              }}
            >
              {LABELS[field]}
            </AppText>
            {upcoming === field && (
              <AppText
                variant="caption"
                style={{
                  color: colors.selectedText,
                  backgroundColor: colors.selectedIcon,
                  borderRadius: 10,
                  overflow: 'hidden',
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  fontSize: 10,
                  lineHeight: 16,
                  fontFamily: tokens.font.medium,
                }}
              >
                {ending ? (fit ? 'Davam edir' : 'Vaxtı davam edir') : 'NÖVBƏTİ'}
              </AppText>
            )}
          </View>
          <AppText
            variant="number"
            style={{
              fontSize: timeSize,
              lineHeight: timeLineHeight,
              fontFamily: tokens.font.bold,
              flexShrink: 0,
              color: upcoming === field ? colors.selectedText : colors.text,
              letterSpacing: -0.3,
              textAlign: 'right',
            }}
          >
            {formatTime(day[field]!, format)}
          </AppText>
          {index < visible.length - 1 && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 16,
                right: 16,
                height: 1,
                backgroundColor: colors.border,
              }}
            />
          )}
        </View>
      ))}
      {showShare && <PrayerTimesShareButton day={day} />}
    </View>
  );
});

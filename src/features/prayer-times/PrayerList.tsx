import { memo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
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
}: {
  day: PrayerDay;
  upcoming?: PrayerField;
  ending?: boolean;
  showShare?: boolean;
}) {
  const fields = usePreferences((s) => s.visibleFields);
  const format = usePreferences((s) => s.timeFormat);
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.5;
  const visible = PRAYER_FIELDS.filter((field) => fields.includes(field) && day[field]);
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.025,
        shadowRadius: 12,
      }}
    >
      {visible.map((field, index) => (
        <View
          key={field}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${LABELS[field]}, ${day[field]}${upcoming === field ? (ending ? ', vaxtı davam edir' : ', növbəti namaz') : ''}`}
          style={{
            minHeight: 44,
            flexDirection: stacked ? 'column' : 'row',
            alignItems: stacked ? 'stretch' : 'center',
            gap: stacked ? 2 : 12,
            paddingVertical: 8,
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
                fontSize: 15,
                lineHeight: 24,
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
                {ending ? 'Vaxtı davam edir' : 'NÖVBƏTİ'}
              </AppText>
            )}
          </View>
          <AppText
            variant="number"
            style={{
              fontSize: format === '12' && width < 360 ? 22 : 24,
              lineHeight: 28,
              fontFamily: tokens.font.semibold,
              flexShrink: 0,
              color: upcoming === field ? colors.selectedText : colors.text,
              letterSpacing: -0.5,
              ...(stacked ? { textAlign: 'right' } : {}),
            }}
          >
            {formatTime(day[field]!, format)}
          </AppText>
          {index < visible.length - 1 && upcoming !== field && upcoming !== visible[index + 1] && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 16,
                right: 16,
                height: StyleSheet.hairlineWidth,
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

import { memo, type ComponentProps } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText, Icon } from '../../components/ui';
import { LABELS, PRAYER_FIELDS, type PrayerField } from '../../constants/prayers';
import type { PrayerDay } from '../../types/data';
import { usePreferences } from '../../store/preferences';
import { tokens, useTheme } from '../../theme';
import { formatTime } from '../../utils/time';
const icons: Record<PrayerField, ComponentProps<typeof Ionicons>['name']> = {
  imsak: 'moon-outline',
  fajr: 'partly-sunny-outline',
  sunrise: 'sunny-outline',
  dhuhr: 'sunny-outline',
  asr: 'time-outline',
  sunset: 'cloudy-night-outline',
  maghrib: 'moon-outline',
  isha: 'moon-outline',
  midnight: 'sparkles-outline',
};
export const PrayerList = memo(function PrayerList({
  day,
  upcoming,
}: {
  day: PrayerDay;
  upcoming?: PrayerField;
}) {
  const fields = usePreferences((s) => s.visibleFields);
  const format = usePreferences((s) => s.timeFormat);
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 8,
      }}
    >
      {PRAYER_FIELDS.filter((field) => fields.includes(field) && day[field]).map((field) => (
        <View
          key={field}
          accessible
          accessibilityLabel={`${LABELS[field]}, ${day[field]}${upcoming === field ? ', növbəti namaz' : ''}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingVertical: 16,
            paddingHorizontal: 16,
            backgroundColor: upcoming === field ? colors.elevated : colors.surface,
            borderRadius: 16,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.elevated,
              borderRadius: 14,
            }}
          >
            <Icon
              name={icons[field]}
              color={upcoming === field ? colors.primary : colors.muted}
              size={20}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText
              style={{ fontFamily: upcoming === field ? tokens.font.bold : tokens.font.medium }}
            >
              {LABELS[field]}
            </AppText>
            {upcoming === field && (
              <AppText variant="caption" style={{ color: colors.primary }}>
                Növbəti namaz
              </AppText>
            )}
          </View>
          <AppText variant="number" style={{ fontSize: 22 }}>
            {formatTime(day[field]!, format)}
          </AppText>
        </View>
      ))}
    </View>
  );
});

import { useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { LABELS, PRAYER_FIELDS } from '../../constants/prayers';
import { usePreferences } from '../../store/preferences';
import { tokens, useTheme } from '../../theme';
import type { PrayerDay } from '../../types/data';
import { formatDate, formatTime } from '../../utils/time';
import { locationName } from '../locations/locations';

export function PrayerTimesShareButton({
  day,
  compact = false,
}: {
  day: PrayerDay;
  compact?: boolean;
}) {
  const format = usePreferences((state) => state.timeFormat);
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);
  if (!PRAYER_FIELDS.some((field) => day[field])) return null;

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    const city = locationName(day.locationId);
    const date = formatDate(day.date);
    const title = `Namaz vaxtları · ${city} · ${date}`;
    const times = PRAYER_FIELDS.flatMap((field) => {
      const time = day[field];
      return time ? [`${LABELS[field]}: ${formatTime(time, format)}`] : [];
    });
    try {
      await Share.share(
        {
          title,
          message: [
            'NurVaxt · Namaz vaxtları',
            city,
            date,
            '',
            ...times,
            '',
            'Mənbə: Qafqaz Müsəlmanları İdarəsi',
          ].join('\n'),
        },
        { dialogTitle: 'Vaxtları paylaş', subject: title },
      );
    } catch (cause) {
      // Browsers reject their share promise when the user closes the sheet.
      if (!(cause instanceof Error && cause.name === 'AbortError')) {
        Alert.alert('Paylaşmaq mümkün olmadı', 'Yenidən cəhd edin.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <View
      style={compact ? { flexShrink: 0 } : { borderTopWidth: 1, borderTopColor: colors.border }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Vaxtları paylaş"
        accessibilityHint="Seçilmiş şəhər və tarix üçün bütün vaxtları paylaşır"
        accessibilityState={{ disabled: sharing, busy: sharing }}
        disabled={sharing}
        onPress={() => void share()}
        style={({ pressed }) => ({
          minHeight: 44,
          ...(compact ? { width: 44, borderRadius: 14 } : {}),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: compact ? 10 : 16,
          backgroundColor: pressed ? colors.pressed : compact ? 'transparent' : colors.surface,
          opacity: sharing ? 0.5 : 1,
        })}
      >
        <Icon name="share-outline" size={18} color={compact ? colors.muted : colors.primary} />
        {!compact && (
          <AppText
            variant="caption"
            style={{ color: colors.primary, fontFamily: tokens.font.semibold, flexShrink: 1 }}
          >
            Vaxtları paylaş
          </AppText>
        )}
      </Pressable>
    </View>
  );
}

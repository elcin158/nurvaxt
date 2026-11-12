import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { AppText, Button } from '../src/components/ui';
import { useActiveClock } from '../src/hooks/useActiveClock';
import { useToday } from '../src/hooks/useToday';
import { usePrayerDays } from '../src/hooks/usePrayerDays';
import { usePreferences } from '../src/store/preferences';
import { useTheme } from '../src/theme';
import { formatDate, shiftDate } from '../src/utils/time';
import { locationName } from '../src/features/locations/locations';
import { nextPrayer } from '../src/features/prayer-times/domain';
import { WIDGET_VARIANTS, type WidgetVariant } from '../src/features/widgets/domain';
import { WidgetPreview } from '../src/features/widgets/WidgetPreview';
import { pinWidget } from '../src/features/widgets/service';

const titles = { large: 'Geniş · 4×3', compact: 'Kompakt · 4×1', small: 'Kiçik · 2×2' };

export default function Widgets() {
  const { colors } = useTheme();
  const locationId = usePreferences((state) => state.locationId);
  const timeFormat = usePreferences((state) => state.timeFormat);
  const now = useActiveClock();
  const today = useToday();
  const { data } = usePrayerDays(shiftDate(today, -1), shiftDate(today, 1));
  const day = data?.find((entry) => entry.date === today && entry.verified);
  const event = day ? nextPrayer(data ?? [], now) : null;
  const [pending, setPending] = useState<WidgetVariant | null>(null);

  async function add(variant: WidgetVariant) {
    setPending(variant);
    try {
      if (!(await pinWidget(variant))) {
        Alert.alert(
          'Ana ekrana əlavə edin',
          'Ana ekranda boş sahəni basılı saxlayın, «Widget-lər» bölməsini açın və NurVaxt-dan istədiyiniz ölçünü seçin.',
        );
      }
    } catch {
      Alert.alert('Widget hazırlana bilmədi', 'Tətbiqi yenidən açıb cəhd edin.');
    } finally {
      setPending(null);
    }
  }

  return (
    <Screen
      bottomSafeArea
      header={<ScreenHeader title="Ana ekran widget-ləri" onBack={() => router.back()} />}
    >
      <AppText style={{ color: colors.muted }}>
        Namaz vaxtlarını ana ekranınızda görün. Hər üç ölçünü birlikdə əlavə edə bilərsiniz.
      </AppText>
      {Platform.OS !== 'android' && (
        <AppText style={{ color: colors.muted }}>
          Ana ekran widget-ləri Android üçün mövcuddur.
        </AppText>
      )}
      {WIDGET_VARIANTS.map((variant) => (
        <View key={variant} style={{ gap: 12 }}>
          <AppText variant="heading">{titles[variant]}</AppText>
          <WidgetPreview
            variant={variant}
            day={day}
            event={event}
            location={locationName(locationId)}
            timeFormat={timeFormat}
            now={now}
            date={formatDate(today).split(',')[0]!}
          />
          <Button
            title={pending === variant ? 'Hazırlanır…' : 'Ana ekrana əlavə et'}
            onPress={() => {
              void add(variant);
            }}
            disabled={pending !== null || Platform.OS !== 'android'}
            secondary={variant !== 'large'}
          />
        </View>
      ))}
      <AppText variant="caption" style={{ color: colors.muted }}>
        Widget-lər seçdiyiniz şəhəri və saat formatını izləyir. Widget-ə toxunaraq NurVaxt-ı aça
        bilərsiniz.
      </AppText>
    </Screen>
  );
}

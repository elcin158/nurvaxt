import { View } from 'react-native';
import { AppText, Card, Chip } from '../../components/ui';
import { usePreferences } from '../../store/preferences';
import { useTheme } from '../../theme';

export function KerahatReminderSettings() {
  const offsets = usePreferences((state) => state.reminders.kerahatOffsets);
  const toggleOffset = usePreferences((state) => state.toggleKerahatOffset);
  const { colors } = useTheme();
  return (
    <Card>
      <AppText variant="heading">Kərahətdən əvvəl</AppText>
      <AppText variant="caption" style={{ marginTop: 8, color: colors.muted }}>
        Kərahətin başlamasından neçə dəqiqə əvvəl bildiriş almaq istədiyinizi seçin. Bu seçim bütün
        kərahət vaxtlarına tətbiq olunur.
      </AppText>
      <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[5, 10, 15, 30].map((offset) => (
          <View key={offset} style={{ flexBasis: '45%', flexGrow: 1 }}>
            <Chip
              title={`${offset} dəq.`}
              accessibilityLabel={`Kərahətdən ${offset} dəqiqə əvvəl`}
              selected={offsets.includes(offset)}
              onPress={() => toggleOffset(offset)}
            />
          </View>
        ))}
      </View>
      <AppText variant="caption" style={{ marginTop: 16, color: colors.muted }}>
        {offsets.length === 0
          ? 'Kərahət xatırlatması söndürülüb.'
          : `${offsets.length} xatırlatma seçilib. İntervallar təxminidir.`}
      </AppText>
    </Card>
  );
}

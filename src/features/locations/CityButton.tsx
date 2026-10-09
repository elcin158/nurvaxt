import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppText, Icon } from '../../components/ui';
import { usePreferences } from '../../store/preferences';
import { locationName } from './locations';
import { useTheme } from '../../theme';
export function CityButton() {
  const city = usePreferences((s) => s.locationId);
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Şəhəri dəyiş: ${locationName(city)}`}
      onPress={() => router.push('/cities')}
      style={{ minHeight: 48, justifyContent: 'center' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="location-outline" size={18} />
        <AppText style={{ color: colors.primary }}>{locationName(city)}</AppText>
        <Icon name="chevron-down" size={14} />
      </View>
    </Pressable>
  );
}

import { ActivityIndicator, Alert, Linking, Platform, View } from 'react-native';
import { SettingsRow } from '../settings/SettingsRow';
import { useTheme } from '../../theme';
import { appUpdates, useAppUpdates } from './service';
import { UpdateBanner } from './UpdateBanner';

export function UpdateSettings() {
  const checking = useAppUpdates((state) => state.checking);
  const { colors } = useTheme();
  if (Platform.OS !== 'android' || !appUpdates.supported) return null;
  async function check() {
    const result = await appUpdates.check(true);
    if (result === 'current')
      Alert.alert('Yeniləmə yoxdur', 'Play Store-da sizin üçün əlçatan yeni versiya yoxdur.');
    if (result === 'error')
      Alert.alert(
        'Yoxlama mümkün olmadı',
        'İnternet bağlantısını yoxlayın və ya tətbiqin Play Store səhifəsinə baxın.',
        [
          { text: 'Bağla', style: 'cancel' },
          {
            text: 'Play Store-u aç',
            onPress: () => {
              void Linking.openURL(
                'https://play.google.com/store/apps/details?id=az.nurvaxt.app',
              ).catch(() =>
                Alert.alert('Play Store açıla bilmədi', 'İnternet bağlantısını yoxlayın.'),
              );
            },
          },
        ],
      );
  }
  return (
    <View style={{ gap: 8 }}>
      <SettingsRow
        title="Yeniləməni yoxla"
        subtitle={checking ? 'Play Store yoxlanılır…' : 'Google Play vasitəsilə'}
        onPress={checking ? undefined : () => void check()}
      >
        {checking ? <ActivityIndicator color={colors.primary} /> : undefined}
      </SettingsRow>
      <UpdateBanner />
    </View>
  );
}

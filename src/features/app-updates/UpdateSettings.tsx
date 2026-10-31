import { ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SettingsRow } from '../settings/SettingsRow';
import { AppText } from '../../components/ui';
import { tokens, useTheme } from '../../theme';
import { appUpdates, downloadProgress, useAppUpdates } from './service';
import { openPlayStore } from './store-page';

export function UpdateSettings() {
  const update = useAppUpdates();
  const checking = update.checking;
  const { colors } = useTheme();
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
            onPress: openPlayStore,
          },
        ],
      );
  }
  const active = update.status !== 'idle';
  const downloading = update.status === 'pending' || update.status === 'downloading';
  const progress = downloadProgress(update);
  const title =
    update.status === 'downloaded'
      ? 'Yeniləmə hazırdır'
      : update.status === 'installing'
        ? 'Yeniləmə quraşdırılır'
        : downloading
          ? 'Yeniləmə yüklənir'
          : active
            ? 'Yeniləmə mövcuddur'
            : 'Yeniləməni yoxla';
  return (
    <>
      <SettingsRow
        title="Yeniliklər"
        subtitle="Versiyalarda nələr dəyişib?"
        onPress={() => router.push('/whats-new')}
      >
        {update.announcement ? (
          <AppText
            variant="caption"
            style={{
              color: colors.primary,
              backgroundColor: colors.selected,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 7,
              fontFamily: tokens.font.semibold,
            }}
          >
            Yeni
          </AppText>
        ) : undefined}
      </SettingsRow>
      {Platform.OS === 'android' && appUpdates.supported && (
        <SettingsRow
          title={title}
          subtitle={
            checking
              ? 'Play Store yoxlanılır…'
              : downloading && progress !== undefined
                ? `${progress}% · Arxa planda yüklənir`
                : update.status === 'downloaded'
                  ? 'Quraşdırmaq üçün toxunun'
                  : 'Google Play vasitəsilə'
          }
          onPress={checking ? undefined : active ? appUpdates.open : () => void check()}
        >
          {checking ? <ActivityIndicator color={colors.primary} /> : undefined}
        </SettingsRow>
      )}
    </>
  );
}

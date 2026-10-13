import { View } from 'react-native';
import { router } from 'expo-router';
import { AppText, Button, Card, Icon } from '../../components/ui';
import { useTheme } from '../../theme';
import { useLiveNotificationAccess } from '../notifications/live';
import { SettingsRow } from './SettingsRow';

export function LiveNotificationEntry({ onboarding = false }: { onboarding?: boolean }) {
  const { access } = useLiveNotificationAccess();
  const { colors } = useTheme();
  if (access.mode === 'unsupported') return null;
  const open = () => router.push('/live-notifications');
  if (!onboarding)
    return (
      <SettingsRow
        title="Canlı göstərici"
        subtitle={
          access.enabled ? 'Növbəti namaza canlı geri sayım' : 'Android canlı bildiriş ayarı'
        }
        onPress={open}
      />
    );
  return (
    <Card>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="timer-outline" />
          <AppText variant="heading">Canlı göstərici</AppText>
        </View>
        <AppText style={{ color: colors.muted }}>
          {access.enabled
            ? 'Canlı bildiriş üçün sistem ayarı aktivdir.'
            : 'Namaza qalan vaxt yuxarı sətirdə görünsün.'}
        </AppText>
        <Button
          title={access.enabled ? 'Görünüşə bax' : 'Canlı göstəricini quraşdır'}
          secondary
          onPress={open}
        />
        <AppText variant="caption" style={{ color: colors.muted }}>
          İndi keçə bilərsiniz. Sonra Ayarlardan quraşdırmaq olar.
        </AppText>
      </View>
    </Card>
  );
}

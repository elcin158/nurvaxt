import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { BrandIcon } from '../src/components/brand/Brand';
import { AppText, Button, Card, Icon } from '../src/components/ui';
import { useTheme } from '../src/theme';
import { usePreferences } from '../src/store/preferences';
import {
  openLiveNotificationSettings,
  useLiveNotificationAccess,
} from '../src/features/notifications/live';
import {
  promptExactAccess,
  requestNotificationPermission,
  requestReconciliation,
} from '../src/features/notifications/service';

export default function LiveNotifications() {
  const { access, refresh } = useLiveNotificationAccess();
  const { colors } = useTheme();
  const prefs = usePreferences();
  const [busy, setBusy] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const countdownEnabled =
    access.notificationsAllowed && prefs.reminders.enabled && prefs.reminders.ongoingCountdown;
  async function enableCountdown() {
    setBusy(true);
    try {
      if (!(await requestNotificationPermission())) {
        Alert.alert('Bildiriş icazəsi yoxdur', 'İcazəni sistemdə aktivləşdirib yenidən yoxlayın.');
        return;
      }
      prefs.set({
        reminders: {
          ...usePreferences.getState().reminders,
          enabled: true,
          ongoingCountdown: true,
        },
      });
      await promptExactAccess();
      await requestReconciliation();
      refresh();
    } catch {
      Alert.alert('Bildiriş açıla bilmədi', 'Bildiriş ayarlarını sistemdə yoxlayın.');
    } finally {
      setBusy(false);
    }
  }
  function openSettings() {
    setSettingsError(!openLiveNotificationSettings());
  }
  return (
    <Screen
      bottomSafeArea
      header={<ScreenHeader title="Canlı göstərici" onBack={() => router.back()} />}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <BrandIcon size={48} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="heading">Vaxt bir baxışda</AppText>
            <AppText style={{ color: colors.muted }}>
              Uyğun telefonlarda namaza qalan vaxt yuxarı sətirdə canlı görünür.
            </AppText>
          </View>
        </View>
        <AppText variant="caption" style={{ color: colors.muted, marginTop: 16 }}>
          Canlı nişan növbəti namaza qədər görünür: bir saatdan çox qalanda saat:dəqiqə, son saatda
          dəqiqə:saniyə.
        </AppText>
      </Card>
      {access.mode === 'unsupported' ? (
        <Card>
          <AppText variant="heading">Bu telefonda canlı bildiriş əlçatan deyil</AppText>
          <AppText style={{ color: colors.muted, marginTop: 12 }}>
            Adi daimi bildirişdə geri sayımı izləyə bilərsiniz.
          </AppText>
        </Card>
      ) : (
        <>
          {!countdownEnabled && (
            <Card>
              <AppText variant="heading">Əvvəl daimi göstəricini aktivləşdirin</AppText>
              <AppText style={{ color: colors.muted, marginVertical: 12 }}>
                Canlı nişan üçün bildirişlər və daimi vaxt göstəricisi açıq olmalıdır.
              </AppText>
              <Button
                title={busy ? 'İcazə yoxlanılır…' : 'Bildirişləri və göstəricini aç'}
                disabled={busy}
                onPress={() => {
                  void enableCountdown();
                }}
              />
            </Card>
          )}
          <Card>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Icon name={access.enabled ? 'checkmark-circle-outline' : 'settings-outline'} />
              <AppText variant="heading">
                {access.promoted
                  ? 'Canlı bildiriş görünür'
                  : access.enabled
                    ? 'Sistem ayarı aktivdir'
                    : 'Sistem ayarını aktivləşdirin'}
              </AppText>
            </View>
            <AppText style={{ color: colors.muted, marginTop: 16 }}>
              {access.enabled
                ? 'Namaza qalan vaxtı sistem canlı nişanda göstərə bilər. Görünüş telefonun dəstəyindən və sistem ayarlarından asılıdır.'
                : 'Açılan NurVaxt bildiriş ayarında canlı bildirişlərə icazə verin.'}
            </AppText>
            {access.canOpenSettings && (
              <View style={{ marginTop: 16 }}>
                <Button
                  title="Canlı bildiriş ayarını aç"
                  secondary={access.enabled}
                  onPress={openSettings}
                />
              </View>
            )}
            {settingsError && (
              <AppText style={{ color: colors.error, marginTop: 12 }}>
                Ayar səhifəsi açıla bilmədi. Telefonun Ayarlar tətbiqindən yuxarıdakı seçimi açın.
              </AppText>
            )}
            <View style={{ marginTop: 12 }}>
              <Button
                title="Vəziyyəti yenidən yoxla"
                secondary
                onPress={() => {
                  refresh();
                  void requestReconciliation();
                }}
              />
            </View>
          </Card>
          <AppText variant="caption" style={{ color: colors.muted }}>
            NurVaxta qayıdanda vəziyyət avtomatik yoxlanılır. Canlı kartın görünüşünü Android idarə
            edir. “Canlı nişanı yığ” həmin namaz üçün adi bildirişə qaytarır.
          </AppText>
        </>
      )}
      <Button title="Hazırdır" onPress={() => router.back()} />
    </Screen>
  );
}

import { useSyncExternalStore } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Screen } from '../../src/components/layout/Screen';
import { BrandIcon } from '../../src/components/brand/Brand';
import { AppText, Button, Card, Chip, ChoiceGroup } from '../../src/components/ui';
import { SettingsRow, Toggle } from '../../src/features/settings/SettingsRow';
import { KerahatDurationSettings } from '../../src/features/settings/KerahatDurationSettings';
import { TimeVisibilitySettings } from '../../src/features/settings/TimeVisibilitySettings';
import { locationName } from '../../src/features/locations/locations';
import { usePreferences } from '../../src/store/preferences';
import {
  diagnosticsStore,
  promptExactAccess,
  requestExactAccess,
  requestNotificationPermission,
} from '../../src/features/notifications/service';
import { useTheme } from '../../src/theme';
import { currentDataset as dataset } from '../../src/database/bundled';
import { availableCoverage } from '../../src/database/coverage';
import { formatDate } from '../../src/utils/time';
import { UpdateSettings } from '../../src/features/app-updates/UpdateSettings';
export default function Settings() {
  const prefs = usePreferences();
  const { colors } = useTheme();
  const diagnostic = useSyncExternalStore(
    diagnosticsStore.subscribe,
    diagnosticsStore.snapshot,
    diagnosticsStore.snapshot,
  );
  async function toggleNotifications(value: boolean) {
    if (!value) {
      prefs.set({ reminders: { ...prefs.reminders, enabled: false } });
      return;
    }
    try {
      const granted = await requestNotificationPermission();
      prefs.set({ reminders: { ...usePreferences.getState().reminders, enabled: granted } });
      if (granted) await promptExactAccess();
      else
        Alert.alert(
          'Bildiriş icazəsi yoxdur',
          'Namaz vaxtları istifadəyə açıqdır. Xatırlatmaları aktivləşdirmək üçün sistem ayarlarında bildirişlərə icazə verin.',
        );
    } catch {
      Alert.alert('Bildiriş açıla bilmədi', 'Bildiriş ayarlarını sistemdə yoxlayın.');
    }
  }
  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="title">Ayarlar</AppText>
          <AppText variant="caption" style={{ color: colors.muted }}>
            Sizə uyğun bir NurVaxt.
          </AppText>
        </View>
        <BrandIcon size={44} />
      </View>
      {prefs.storageError && (
        <AppText style={{ color: colors.error }}>{prefs.storageError}</AppText>
      )}
      <View style={{ gap: 12 }}>
        <AppText variant="caption" style={{ color: colors.muted }}>
          ÜMUMİ
        </AppText>
        <Card>
          <SettingsRow
            title="Şəhər"
            subtitle={locationName(prefs.locationId)}
            onPress={() => router.push('/cities')}
          />
          <SettingsRow title="Dil" subtitle="Azərbaycan dili" />
          <SettingsRow title="Görünüş" />
          <ChoiceGroup>
            {(['light', 'dark', 'system'] as const).map((mode, i) => (
              <Chip
                key={mode}
                segment
                title={['Açıq', 'Tünd', 'Sistem'][i]!}
                selected={prefs.theme === mode}
                onPress={() => prefs.set({ theme: mode })}
              />
            ))}
          </ChoiceGroup>
          <SettingsRow title="Saat formatı" />
          <ChoiceGroup>
            {(['24', '12'] as const).map((format) => (
              <Chip
                key={format}
                segment
                title={`${format} saat`}
                selected={prefs.timeFormat === format}
                onPress={() => prefs.set({ timeFormat: format })}
              />
            ))}
          </ChoiceGroup>
          <SettingsRow title="Kərahət vaxtları" subtitle="Təxmini intervallar">
            <Toggle
              label="Kərahət vaxtlarını göstər"
              value={prefs.showKerahat}
              onChange={(showKerahat) => prefs.set({ showKerahat })}
            />
          </SettingsRow>
          {prefs.showKerahat && <KerahatDurationSettings />}
          <SettingsRow
            title="Hicri tarixi göstər"
            subtitle="Mülki islam təqvimi · hesablanmış tarix"
          >
            <Toggle
              label="Hicri tarixi göstər"
              value={prefs.showHijri}
              onChange={(value) => prefs.set({ showHijri: value })}
            />
          </SettingsRow>
          {prefs.showHijri && (
            <>
              <AppText variant="caption">Gün düzəlişi</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[-2, -1, 0, 1, 2].map((value) => (
                  <Chip
                    key={value}
                    title={value > 0 ? `+${value}` : String(value)}
                    selected={prefs.hijriAdjustment === value}
                    onPress={() => prefs.set({ hijriAdjustment: value })}
                  />
                ))}
              </View>
            </>
          )}
        </Card>
      </View>
      <View style={{ gap: 12 }}>
        <AppText variant="caption" style={{ color: colors.muted }}>
          BİLDİRİŞLƏR
        </AppText>
        <Card>
          <SettingsRow
            title="Bildirişləri aktivləşdir"
            subtitle={
              diagnostic.permission === 'denied'
                ? 'Sistem icazəsi verilməyib'
                : diagnostic.permission === 'granted'
                  ? 'Sistem icazəsi aktivdir'
                  : 'Namaz vaxtında və əvvəl yerli bildirişlər'
            }
          >
            <Toggle
              label="Bildirişləri aktivləşdir"
              value={prefs.reminders.enabled}
              onChange={(value) => {
                void toggleNotifications(value);
              }}
            />
          </SettingsRow>
          <SettingsRow
            title="Namaz üzrə xatırlatmalar"
            subtitle="Namaz vaxtında və əvvəl, kərahətdən əvvəl xatırlatmalar"
            onPress={() => router.push('/reminders')}
          />
          {Platform.OS === 'android' && (
            <SettingsRow
              title="Daimi vaxt göstəricisi"
              subtitle="Yuxarı sətirdə nişan, bildiriş panelində geri sayım"
            >
              <Toggle
                label="Daimi vaxt göstəricisi"
                value={prefs.reminders.ongoingCountdown}
                onChange={(ongoingCountdown) =>
                  prefs.set({ reminders: { ...prefs.reminders, ongoingCountdown } })
                }
              />
            </SettingsRow>
          )}
          {diagnostic.countdownError && (
            <AppText variant="caption" style={{ color: colors.error }}>
              Daimi göstərici açıla bilmədi. Tətbiqi yenidən açın və bildiriş ayarlarını yoxlayın.
            </AppText>
          )}
          {diagnostic.permission === 'denied' && (
            <Button
              title="Sistem ayarlarını aç"
              secondary
              onPress={() => {
                void Linking.openSettings();
              }}
            />
          )}
          {Platform.OS === 'android' && diagnostic.exact === false && (
            <>
              <AppText variant="caption" style={{ color: colors.muted }}>
                Dəqiq xatırlatmalar üçün «Siqnallar və xatırlatmalar» icazəsi lazımdır. İcazəsiz
                bildiriş gecikə bilər.
              </AppText>
              <Button title="Dəqiq vaxt icazəsi" secondary onPress={requestExactAccess} />
            </>
          )}
          {diagnostic.lastError && (
            <AppText variant="caption" style={{ color: colors.error }}>
              Bildiriş planı qurula bilmədi. Tətbiqi yenidən açın və sistem icazələrini yoxlayın.
            </AppText>
          )}
        </Card>
      </View>
      <View style={{ gap: 12 }}>
        <AppText variant="caption" style={{ color: colors.muted }}>
          GÖSTƏRİLƏN VAXTLAR
        </AppText>
        <Card>
          <TimeVisibilitySettings />
          <AppText variant="caption" style={{ color: colors.muted, marginTop: 16 }}>
            İmsak və Günçıxma beş gündəlik namazın sayına daxil deyil.
          </AppText>
        </Card>
      </View>
      <View style={{ gap: 12 }}>
        <AppText variant="caption" style={{ color: colors.muted }}>
          MƏLUMATLAR
        </AppText>
        <Card>
          <SettingsRow title="Namaz vaxtlarının mənbəyi" subtitle="Qafqaz Müsəlmanları İdarəsi" />
          <SettingsRow title="Mövcud təqvimlər" subtitle={availableCoverage} />
          <SettingsRow title="Məlumat versiyası" subtitle={dataset.version} />
          <SettingsRow
            title="Son mənbə yoxlaması"
            subtitle={`${formatDate(dataset.verifiedAt.slice(0, 10))} · mənbə ilə tutuşdurulub`}
          />
        </Card>
      </View>
      <Card>
        <SettingsRow
          title="NurVaxt haqqında"
          subtitle="Namaz vaxtları hər zaman yanında"
          onPress={() => router.push('/about')}
        />
        <SettingsRow title="Tətbiq versiyası" subtitle={Constants.expoConfig?.version ?? '1.0.0'} />
        <UpdateSettings />
        <SettingsRow
          title="Məxfilik siyasəti"
          onPress={() => router.push({ pathname: '/legal', params: { type: 'privacy' } })}
        />
        <SettingsRow
          title="İstifadə şərtləri"
          onPress={() => router.push({ pathname: '/legal', params: { type: 'terms' } })}
        />
      </Card>
      <AppText variant="caption" style={{ textAlign: 'center', color: colors.muted }}>
        Sakitlik üçün hazırlanıb.
      </AppText>
    </Screen>
  );
}

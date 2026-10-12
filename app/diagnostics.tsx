import { useEffect, useSyncExternalStore } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { AppText, Button, Card } from '../src/components/ui';
import { useActiveClock } from '../src/hooks/useActiveClock';
import {
  diagnosticsStore,
  refreshDiagnostics,
  requestReconciliation,
  testNotification,
} from '../src/features/notifications/service';
import { usePreferences } from '../src/store/preferences';
import { locationName } from '../src/features/locations/locations';
import { DateTime } from 'luxon';
import { TIMEZONE } from '../src/constants/prayers';
export default function Diagnostics() {
  const now = useActiveClock(5000);
  const location = usePreferences((s) => s.locationId);
  const d = useSyncExternalStore(
    diagnosticsStore.subscribe,
    diagnosticsStore.snapshot,
    diagnosticsStore.snapshot,
  );
  useEffect(() => {
    void refreshDiagnostics().catch(() => {});
  }, []);
  const time = (ms: number) =>
    DateTime.fromMillis(ms, { zone: TIMEZONE }).toFormat('yyyy-MM-dd HH:mm:ss');
  const permission =
    (
      {
        granted: 'İcazə verilib',
        denied: 'İcazə verilməyib',
        undetermined: 'Hələ soruşulmayıb',
        unknown: 'Yoxlanılır',
        unavailable: 'Bu platformada yoxdur',
      } as Record<string, string>
    )[d.permission] ?? d.permission;
  const status =
    (
      {
        idle: 'Gözləyir',
        reconciling: 'Yenilənir',
        ready: 'Hazırdır',
        error: 'Xəta',
        unsupported: 'Dəstəklənmir',
      } as Record<string, string>
    )[d.status] ?? d.status;
  return (
    <Screen
      bottomSafeArea
      header={<ScreenHeader title="Diaqnostika" action="close" onBack={() => router.back()} />}
    >
      <Card>
        <View style={{ gap: 16 }}>
          {[
            ['İcazə', permission],
            ['Şəhər', locationName(location)],
            ['Saat qurşağı', TIMEZONE],
            ['Cari vaxt', time(now)],
            ['Növbəti bildiriş', d.next ? time(d.next) : 'Plan yoxdur'],
            ['Sistem növbəsi', String(d.pending)],
            ['Saxlanılan plan', String(d.queued)],
            ['Daimi göstərici', d.countdownActive ? 'Aktivdir' : 'Aktiv deyil'],
            ['Göstərici xətası', d.countdownError ?? 'Yoxdur'],
            [
              'Dəqiq vaxt',
              d.exact === null ? 'Tətbiq edilmir' : d.exact ? 'Aktivdir' : 'İcazə yoxdur',
            ],
            ['Son əməliyyat', d.lastOperation ?? 'Yoxdur'],
            ['Son xəta', d.lastError ?? 'Yoxdur'],
            ['Yenilənmə statusu', status],
          ].map(([label, value]) => (
            <View key={label}>
              <AppText variant="caption">{label}</AppText>
              <AppText selectable>{value}</AppText>
            </View>
          ))}
        </View>
      </Card>
      <Button
        title="Planı yenilə"
        onPress={() => {
          void requestReconciliation();
        }}
      />
      <Button
        title="5 saniyə sonra sınaq bildirişi"
        secondary
        onPress={() => {
          void testNotification().catch((error) => Alert.alert('Sınaq alınmadı', error.message));
        }}
      />
    </Screen>
  );
}

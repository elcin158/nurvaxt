import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Alarm from '../../../modules/nurvaxt-alarm/src';
import { usePreferences } from '../../store/preferences';
import { readDays } from '../../database/repository';
import { shiftDate, todayISO } from '../../utils/time';
import { locationName } from '../locations/locations';
import {
  notificationFingerprint,
  planCountdown,
  planSolarCountdown,
  planNotifications,
  type PlannedNotification,
} from './domain';
import { reconcile, type NotificationAdapter } from './reconcile';
import { notificationSound } from './sounds';
export type Diagnostics = {
  permission: string;
  lastOperation: string | null;
  lastError: string | null;
  status: string;
  pending: number;
  queued: number;
  next: number | null;
  exact: boolean | null;
  countdownActive: boolean;
  countdownError: string | null;
};
let diagnostic: Diagnostics = {
  permission: 'unknown',
  lastOperation: null,
  lastError: null,
  status: 'idle',
  pending: 0,
  queued: 0,
  next: null,
  exact: null,
  countdownActive: false,
  countdownError: null,
};
const listeners = new Set<() => void>();
export const diagnosticsStore = {
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  snapshot: () => diagnostic,
};
function update(value: Partial<Diagnostics>) {
  diagnostic = { ...diagnostic, ...value };
  listeners.forEach((fn) => fn());
}
const native = Platform.OS === 'android' || Platform.OS === 'ios';
if (native)
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: notification.request.content.sound !== null,
      shouldSetBadge: false,
    }),
  });
const expoAdapter: NotificationAdapter = {
  pending: async () =>
    (await Notifications.getAllScheduledNotificationsAsync()).map((n) => ({
      id: n.identifier,
      fingerprint: String(n.content.data?.fingerprint ?? ''),
    })),
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  schedule: async (event: PlannedNotification) => {
    await Notifications.scheduleNotificationAsync({
      identifier: event.id,
      content: {
        title: event.title,
        body: event.body,
        sound: notificationSound(event.sound),
        data: { fingerprint: notificationFingerprint(event) },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(event.timestamp),
      },
    });
  },
};
async function run() {
  if (!native) {
    update({ status: 'unsupported', permission: 'unavailable' });
    return;
  }
  try {
    update({ status: 'reconciling' });
    const permission = await Notifications.getPermissionsAsync();
    const allowed =
      permission.granted ||
      permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    update({ permission: allowed ? 'granted' : permission.status });
    const today = todayISO();
    const location = usePreferences.getState().locationId;
    const days = await readDays(location, shiftDate(today, -1), shiftDate(today, 370));
    // If settings changed during IO, the serialized follow-up run will apply the latest selection.
    const prefs = usePreferences.getState();
    if (prefs.locationId !== location) return;
    const desired = planNotifications(
      days,
      location,
      { ...prefs.reminders, enabled: prefs.reminders.enabled && allowed },
      Date.now(),
      Platform.OS === 'android' ? 12000 : 60,
    );
    if (Platform.OS === 'android') {
      if (!Alarm)
        throw new Error('Android bildiriş modulu yoxdur. Development build-i yenidən qurun.');
      await Alarm.replacePlan(JSON.stringify(desired));
      await Alarm.replaceCountdownPlan(
        JSON.stringify({
          enabled: prefs.reminders.enabled && prefs.reminders.ongoingCountdown && allowed,
          location: locationName(location),
          timeFormat: prefs.timeFormat,
          events: planCountdown(days, location),
          ...planSolarCountdown(days, location, prefs.showKerahat, prefs.kerahatDurations),
        }),
      );
      const state = Alarm.diagnostics();
      update({
        pending: state.count,
        queued: state.queued,
        next: state.next,
        exact: state.exact,
        countdownActive: state.countdownActive,
        countdownError: state.countdownError,
      });
    } else {
      await reconcile(expoAdapter, desired);
      update({
        pending: desired.length,
        queued: desired.length,
        next: desired[0]?.timestamp ?? null,
      });
    }
    update({ status: 'ready', lastOperation: new Date().toISOString(), lastError: null });
    await AsyncStorage.setItem('nurvaxt-scheduling-diagnostics', JSON.stringify(diagnostic));
  } catch (error) {
    update({
      status: 'error',
      lastError: error instanceof Error ? error.message : 'Bildiriş planı qurula bilmədi.',
    });
  }
}
let queue = Promise.resolve();
export function requestReconciliation() {
  queue = queue.then(run, run);
  return queue;
}
export async function requestNotificationPermission() {
  if (!native) return false;
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('nurvaxt-default-true-v1', {
      name: 'Namaz xatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200],
    });
  const existing = await Notifications.getPermissionsAsync();
  const result = existing.granted
    ? existing
    : existing.canAskAgain
      ? await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        })
      : existing;
  update({ permission: result.status });
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}
export function requestExactAccess() {
  Alarm?.requestExactAccess();
}
export function exactAlarmsAllowed() {
  return Platform.OS !== 'android' || Alarm?.diagnostics().exact !== false;
}
// Android 14+ does not grant exact alarms to new installs. Inexact alarms can be delayed
// for hours, and the native queue drops reminders more than ten minutes late.
const EXACT_PROMPTED_KEY = 'nurvaxt-exact-prompted';
export function promptExactAccess() {
  return new Promise<void>((resolve) => {
    if (exactAlarmsAllowed()) return resolve();
    void AsyncStorage.setItem(EXACT_PROMPTED_KEY, '1').catch(() => {});
    Alert.alert(
      'Dəqiq vaxt icazəsi',
      'Bildirişlərin namaz vaxtında gəlməsi üçün «Siqnallar və xatırlatmalar» icazəsini aktivləşdirin. İcazəsiz bildirişlər gecikə və ya ümumiyyətlə gəlməyə bilər.',
      [
        { text: 'Sonra', style: 'cancel', onPress: () => resolve() },
        {
          text: 'İcazə ver',
          onPress: () => {
            requestExactAccess();
            resolve();
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve() },
    );
  });
}
// Users who enabled reminders before this prompt existed are asked once on launch.
export async function promptExactAccessOnce() {
  if (exactAlarmsAllowed()) return;
  if (await AsyncStorage.getItem(EXACT_PROMPTED_KEY).catch(() => '1')) return;
  await promptExactAccess();
}
export async function refreshDiagnostics() {
  if (!native) return;
  const permission = await Notifications.getPermissionsAsync();
  const stored = await AsyncStorage.getItem('nurvaxt-scheduling-diagnostics');
  if (stored && diagnostic.lastOperation === null) {
    try {
      update(JSON.parse(stored));
    } catch {
      /* Ignore damaged diagnostics. */
    }
  }
  if (Platform.OS === 'android' && Alarm) {
    const state = Alarm.diagnostics();
    update({
      permission: permission.status,
      pending: state.count,
      queued: state.queued,
      next: state.next,
      exact: state.exact,
      lastOperation: state.lastOperation,
      lastError: state.lastError,
      countdownActive: state.countdownActive,
      countdownError: state.countdownError,
    });
  } else {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    update({ permission: permission.status, pending: pending.length });
  }
}
export async function testNotification() {
  if (!(await requestNotificationPermission())) throw new Error('Bildiriş icazəsi verilməyib.');
  // Complete any permission-resume reconciliation before appending the native test event.
  await requestReconciliation();
  if (Platform.OS === 'android') {
    if (!Alarm) throw new Error('Android bildiriş modulu yoxdur.');
    await Alarm.scheduleTest();
    await refreshDiagnostics();
    return;
  }
  await Notifications.scheduleNotificationAsync({
    identifier: `nurvaxt-test:${Date.now()}`,
    content: {
      title: 'NurVaxt',
      body: 'Sınaq bildirişi. Namaz xatırlatmaları üçün icazə aktivdir.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: 'nurvaxt-default-true-v1',
    },
  });
}

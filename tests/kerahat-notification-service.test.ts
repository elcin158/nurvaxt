import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Alarm from '../modules/nurvaxt-alarm/src';
import { readDays } from '../src/database/repository';
import { requestReconciliation } from '../src/features/notifications/service';
import { defaultPreferences, usePreferences } from '../src/store/preferences';
import { datasetSchema } from '../src/types/data';
import { atTime } from '../src/utils/time';
import dataset from '../data/verified/2026.json';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => ''),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));
jest.mock('../modules/nurvaxt-alarm/src', () => ({
  __esModule: true,
  default: {
    replacePlan: jest.fn(async () => {}),
    replaceCountdownPlan: jest.fn(async () => {}),
    diagnostics: jest.fn(() => ({ count: 1, queued: 1, exact: true })),
  },
}));
jest.mock('../src/database/repository', () => ({ readDays: jest.fn() }));

const day = datasetSchema
  .parse(dataset)
  .records.find((record) => record.locationId === 'qmi-1' && record.date === '2026-10-08')!;
const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-07T20:00:00Z'));
  jest.mocked(readDays).mockResolvedValue([day]);
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: true,
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
  } as Notifications.NotificationPermissionsStatus);
  usePreferences.setState({
    ...defaultPreferences,
    showKerahat: false,
    kerahatDurations: { morning: 0, noon: 30, evening: 0 },
    reminders: {
      ...defaultPreferences.reminders,
      enabled: true,
      ongoingCountdown: false,
      atPrayerTime: false,
      offsets: { imsak: [], fajr: [], dhuhr: [], asr: [], maghrib: [], isha: [] },
      kerahatOffsets: [15],
    },
  });
});
afterEach(() => {
  Platform.OS = originalOS;
  jest.restoreAllMocks();
});

test.each(['android', 'ios'] as const)(
  '%s scheduler delivers kerahat selections with the saved duration even when the card and countdown are hidden',
  async (os) => {
    Platform.OS = os;
    await requestReconciliation();
    const timestamp = atTime(day.date, day.dhuhr!) - 45 * 60_000;
    if (os === 'android') {
      expect(JSON.parse(jest.mocked(Alarm!.replacePlan).mock.calls[0]![0])).toEqual([
        expect.objectContaining({ prayer: 'kerahat-noon', timestamp, offset: 15 }),
      ]);
      expect(JSON.parse(jest.mocked(Alarm!.replaceCountdownPlan).mock.calls[0]![0])).toMatchObject({
        enabled: false,
        kerahat: [],
      });
    } else {
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: `nurvaxt:qmi-1:${day.date}:kerahat-noon:15`,
          trigger: { type: 'date', date: new Date(timestamp) },
          content: expect.objectContaining({
            body: 'Zəval kərahətinin başlamasına təxminən 15 dəqiqə qalıb.',
          }),
        }),
      );
    }
  },
);

test.each(['android', 'ios'] as const)(
  '%s removes kerahat alerts when notification permission is denied',
  async (os) => {
    Platform.OS = os;
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      status: 'denied',
      canAskAgain: false,
      expires: 'never',
    } as Notifications.NotificationPermissionsStatus);
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValueOnce([
        { identifier: `nurvaxt:qmi-1:${day.date}:kerahat-noon:15`, content: { data: {} } },
      ] as Notifications.NotificationRequest[]);
    await requestReconciliation();
    if (os === 'android') {
      expect(Alarm!.replacePlan).toHaveBeenCalledWith('[]');
    } else {
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        `nurvaxt:qmi-1:${day.date}:kerahat-noon:15`,
      );
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    }
  },
);

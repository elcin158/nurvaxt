import { DateTime } from 'luxon';
import {
  defaultReminders,
  isQuiet,
  notificationFingerprint,
  notificationId,
  planNotifications,
  planCountdown,
  planSolarCountdown,
  reconciliationDiff,
  type ReminderPreferences,
} from '../src/features/notifications/domain';
import { reconcile, type NotificationAdapter } from '../src/features/notifications/reconcile';
import { datasetSchema } from '../src/types/data';
import dataset from '../data/verified/2026.json';
import { atTime } from '../src/utils/time';
const days = datasetSchema.parse(dataset).records;
const now = DateTime.fromISO('2026-10-08T00:00', { zone: 'Asia/Baku' }).toMillis();
const prefs: ReminderPreferences = {
  ...defaultReminders,
  enabled: true,
  offsets: { ...defaultReminders.offsets, fajr: [15, 5, 0, 5], imsak: [10] },
};
test('independent offsets, distinct İmsak and deduplication', () => {
  const events = planNotifications(days, 'qmi-1', prefs, now);
  const fajr = events.filter((e) => e.date === '2026-10-08' && e.prayer === 'fajr');
  expect(fajr.map((e) => e.offset)).toEqual([15, 5, 0]);
  expect(fajr[0]?.body).toBe('Sübh namazına 15 dəqiqə qalıb.');
  expect(events.find((e) => e.prayer === 'imsak')?.timestamp).toBe(
    Date.parse('2026-10-08T01:10:00Z'),
  );
  expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
});
test('bounded future schedules, denied/off and missing city', () => {
  expect(planNotifications(days, 'qmi-1', prefs, now, 60)).toHaveLength(60);
  expect(planNotifications(days, 'unpublished-city', prefs, now)).toEqual([]);
  expect(planNotifications(days, 'qmi-1', { ...prefs, enabled: false }, now)).toEqual([]);
  expect(planNotifications(days, 'qmi-1', prefs, Date.parse('2027-01-01'))).toEqual([]);
});
test('quiet hours support midnight crossing and exact boundaries', () => {
  const stamp = (time: string) =>
    DateTime.fromISO(`2026-10-08T${time}`, { zone: 'Asia/Baku' }).toMillis();
  const quiet = { enabled: true, start: '23:00', end: '05:00' };
  expect(isQuiet(stamp('23:00'), quiet)).toBe(true);
  expect(isQuiet(stamp('04:59'), quiet)).toBe(true);
  expect(isQuiet(stamp('05:00'), quiet)).toBe(false);
  expect(isQuiet(stamp('12:00'), quiet)).toBe(false);
});
test('stable identifier distinguishes city, date, prayer and offset', () => {
  expect(notificationId('qmi-1', '2026-10-08', 'fajr', 5)).toBe('nurvaxt:qmi-1:2026-10-08:fajr:5');
});
test('rejects unsafe reminder offsets and unverified data', () => {
  const invalid = {
    ...prefs,
    atPrayerTime: false,
    offsets: { imsak: [30], fajr: [-1, 121, 1.5], dhuhr: [], asr: [], maghrib: [], isha: [] },
  };
  expect(planNotifications(days, 'qmi-1', invalid, now)).toEqual([]);
  expect(
    planNotifications(
      days.map((d) => ({ ...d, verified: false })),
      'qmi-1',
      prefs,
      now,
    ),
  ).toEqual([]);
});
test('every daily prayer has an at-time notification even with no advance reminder', () => {
  const events = planNotifications(
    days.slice(7, 8),
    'qmi-1',
    {
      ...defaultReminders,
      enabled: true,
      offsets: { imsak: [], fajr: [], dhuhr: [], asr: [], maghrib: [], isha: [] },
    },
    now,
  );
  expect(events.map((event) => [event.prayer, event.offset])).toEqual([
    ['fajr', 0],
    ['dhuhr', 0],
    ['asr', 0],
    ['maghrib', 0],
    ['isha', 0],
  ]);
  expect(events[0]?.body).toBe('Sübh namazının vaxtı daxil oldu.');
  expect(events[0]?.timestamp).toBe(Date.parse('2026-10-08T01:25:00Z'));
});
test('at-time toggle controls legacy zero offsets without disabling advance reminders or İmsak', () => {
  const events = planNotifications(
    days.slice(7, 8),
    'qmi-1',
    {
      ...prefs,
      atPrayerTime: false,
      offsets: { ...prefs.offsets, imsak: [0], fajr: [0, 10] },
    },
    now,
  );
  expect(events.filter((event) => event.prayer === 'fajr').map((event) => event.offset)).toEqual([
    10,
  ]);
  expect(events.filter((event) => event.offset === 0).map((event) => event.prayer)).toEqual([
    'imsak',
  ]);
});
test('quiet hours and past-time filtering also apply to at-time notifications', () => {
  const events = planNotifications(
    days.slice(7, 8),
    'qmi-1',
    {
      ...prefs,
      quietHours: { enabled: true, start: '05:00', end: '06:00' },
    },
    now,
  );
  expect(events.some((event) => event.prayer === 'fajr')).toBe(false);
  expect(events.some((event) => event.prayer === 'dhuhr' && event.offset === 0)).toBe(true);
  const afterNoon = Date.parse('2026-10-08T09:00:00Z');
  expect(
    planNotifications(days.slice(7, 8), 'qmi-1', prefs, afterNoon).every(
      (event) => event.timestamp > afterNoon,
    ),
  ).toBe(true);
});
test('ongoing countdown includes verified İmsak before Sübh for the selected city', () => {
  const events = planCountdown(days.slice(7, 9), 'qmi-1');
  expect(events).toHaveLength(14);
  expect(events[0]).toMatchObject({
    name: 'İmsak',
    phase: 'start',
    time: '05:20',
    previousTimestamp: null,
  });
  expect(events[1]).toMatchObject({
    name: 'Sübh',
    phase: 'start',
    time: '05:25',
    previousTimestamp: events[0]?.timestamp,
  });
  expect(events[2]).toMatchObject({
    name: 'Sübh',
    phase: 'end',
    time: '06:44',
    previousTimestamp: events[1]?.timestamp,
    timestamp: atTime('2026-10-08', '06:44'),
  });
  expect(events[7]).toMatchObject({
    name: 'İmsak',
    date: '2026-10-09',
    phase: 'start',
    previousTimestamp: events[6]?.timestamp,
  });
  expect(events[8]).toMatchObject({
    name: 'Sübh',
    phase: 'start',
    previousTimestamp: events[7]?.timestamp,
  });
  expect(planCountdown([{ ...days[7]!, sunrise: null }], 'qmi-1')).toHaveLength(6);
  expect(planCountdown(days, 'unpublished-city')).toEqual([]);
  expect(
    planCountdown(
      days.map((day) => ({ ...day, verified: false })),
      'qmi-1',
    ),
  ).toEqual([]);
});

test('persistent solar plan omits kerahat entirely when the feature is off', () => {
  const records = days.slice(7, 9);
  expect(
    planSolarCountdown(records, 'qmi-1', false, { morning: 45, noon: 45, evening: 45 }),
  ).toEqual({ kerahat: [] });
});

test('persistent kerahat plan uses each selected warning and actual sunset', () => {
  const record = days[7]!;
  const plan = planSolarCountdown([record], 'qmi-1', true, { morning: 0, noon: 20, evening: 60 });
  expect(plan.kerahat).toHaveLength(3);
  expect(plan.kerahat.map((window) => (window.start - window.warningStart) / 60_000)).toEqual([
    0, 20, 60,
  ]);
  expect(plan.kerahat[2]!.end).toBe(atTime(record.date, record.sunset!));
  expect(plan.kerahat[2]!.end).not.toBe(atTime(record.date, record.maghrib!));
});

test('solar panel never uses another city or an unverified endpoint', () => {
  const records = days.slice(7, 9);
  const warnings = { morning: 45, noon: 45, evening: 45 };
  expect(planSolarCountdown(records, 'qmi-20', true, warnings)).toEqual({ kerahat: [] });
  expect(
    planSolarCountdown(
      records.map((day) => ({ ...day, verified: false })),
      'qmi-1',
      true,
      warnings,
    ),
  ).toEqual({ kerahat: [] });
});
test('reconciliation replaces changed content/sound and keeps identical events', () => {
  const desired = planNotifications(days, 'qmi-1', prefs, now, 2);
  const pending = [
    { id: desired[0]!.id, fingerprint: notificationFingerprint(desired[0]!) },
    { id: desired[1]!.id, fingerprint: 'stale' },
    { id: 'nurvaxt:old-city', fingerprint: 'old' },
    { id: 'unrelated', fingerprint: 'other' },
  ];
  const diff = reconciliationDiff(pending, desired);
  expect(diff.cancel).toEqual([desired[1]!.id, 'nurvaxt:old-city']);
  expect(diff.schedule).toEqual([desired[1]]);
});
test('integration: repeated reconciliation, preferences update and city change are idempotent', async () => {
  const pending = new Map<string, string>();
  let scheduleCount = 0;
  const adapter: NotificationAdapter = {
    pending: async () => [...pending].map(([id, fingerprint]) => ({ id, fingerprint })),
    cancel: async (id) => {
      pending.delete(id);
    },
    schedule: async (event) => {
      pending.set(event.id, notificationFingerprint(event));
      scheduleCount++;
    },
  };
  const desired = planNotifications(days, 'qmi-1', prefs, now);
  await reconcile(adapter, desired);
  await reconcile(adapter, desired);
  expect(scheduleCount).toBe(desired.length);
  const changed = planNotifications(days, 'qmi-1', { ...prefs, sound: 'silent' }, now);
  await reconcile(adapter, changed);
  expect(scheduleCount).toBe(desired.length * 2);
  const gence = planNotifications(days, 'qmi-20', prefs, now);
  expect(gence).toHaveLength(60);
  expect(gence.find((event) => event.prayer === 'fajr' && event.offset === 0)?.timestamp).toBe(
    Date.parse('2026-10-08T01:38:00Z'),
  );
  await reconcile(adapter, gence);
  expect(pending.size).toBe(gence.length);
  expect([...pending.keys()].every((id) => id.startsWith('nurvaxt:qmi-20:'))).toBe(true);
  await reconcile(adapter, planNotifications(days, 'unpublished-city', prefs, now));
  expect(pending.size).toBe(0);
});

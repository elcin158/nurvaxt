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

const kerahatPrefs: ReminderPreferences = {
  ...defaultReminders,
  enabled: true,
  atPrayerTime: false,
  ongoingCountdown: false,
  offsets: { imsak: [], fajr: [], dhuhr: [], asr: [], maghrib: [], isha: [] },
  kerahatOffsets: [5, 15, 5],
  sound: 'soft',
  vibration: false,
};

test('one kerahat minute selection applies to all interval starts with the saved durations', () => {
  const day = days[7]!;
  const events = planNotifications([day, day], 'qmi-1', kerahatPrefs, now, 60, {
    morning: 20,
    noon: 30,
    evening: 60,
  });
  expect(events.map(({ prayer, offset, timestamp }) => [prayer, offset, timestamp])).toEqual([
    ['kerahat-morning', 15, atTime(day.date, day.sunrise!) - 15 * 60_000],
    ['kerahat-morning', 5, atTime(day.date, day.sunrise!) - 5 * 60_000],
    ['kerahat-noon', 15, atTime(day.date, day.dhuhr!) - 45 * 60_000],
    ['kerahat-noon', 5, atTime(day.date, day.dhuhr!) - 35 * 60_000],
    ['kerahat-evening', 15, atTime(day.date, day.sunset!) - 75 * 60_000],
    ['kerahat-evening', 5, atTime(day.date, day.sunset!) - 65 * 60_000],
  ]);
  expect(events[0]).toMatchObject({
    id: `nurvaxt:qmi-1:${day.date}:kerahat-morning:15`,
    body: 'Günçıxma kərahətinin başlamasına təxminən 15 dəqiqə qalıb.',
    sound: 'soft',
    vibration: false,
  });
  expect(new Set(events.map((event) => event.id)).size).toBe(6);
});

test('kerahat reminders are opt-in and omit disabled periods, missing endpoints and unverified cities', () => {
  const day = days[7]!;
  expect(planNotifications([day], 'qmi-1', { ...kerahatPrefs, enabled: false }, now)).toEqual([]);
  expect(planNotifications([day], 'qmi-20', kerahatPrefs, now)).toEqual([]);
  expect(planNotifications([{ ...day, verified: false }], 'qmi-1', kerahatPrefs, now)).toEqual([]);
  expect(
    planNotifications(
      [{ ...day, sunrise: null, dhuhr: null, sunset: null }],
      'qmi-1',
      kerahatPrefs,
      now,
    ),
  ).toEqual([]);
  expect(
    planNotifications([day], 'qmi-1', kerahatPrefs, now, 60, {
      morning: 0,
      noon: 10,
      evening: 0,
    }).map((event) => event.prayer),
  ).toEqual(['kerahat-noon', 'kerahat-noon']);
  expect(
    planNotifications(
      [day],
      'qmi-1',
      { ...kerahatPrefs, kerahatOffsets: defaultReminders.kerahatOffsets },
      now,
    ),
  ).toEqual([]);
  expect(
    planNotifications(
      [day],
      'qmi-1',
      {
        ...kerahatPrefs,
        kerahatOffsets: [-1, 0, 121, 1.5],
      },
      now,
    ),
  ).toEqual([]);
});

test('kerahat reminders share quiet hours, future filtering and the platform queue limit with prayers', () => {
  const day = days[7]!;
  const events = planNotifications(
    [day],
    'qmi-1',
    {
      ...kerahatPrefs,
      atPrayerTime: true,
      quietHours: { enabled: true, start: '06:00', end: '07:00' },
    },
    now,
  );
  expect(events.some((event) => event.prayer === 'kerahat-morning')).toBe(false);
  expect(events.some((event) => event.prayer === 'kerahat-noon')).toBe(true);
  const all = planNotifications([day], 'qmi-1', { ...kerahatPrefs, atPrayerTime: true }, now);
  expect(
    planNotifications([day], 'qmi-1', { ...kerahatPrefs, atPrayerTime: true }, now, 3),
  ).toEqual(all.slice(0, 3));
  const morningTime = atTime(day.date, day.sunrise!) - 5 * 60_000;
  expect(
    planNotifications([day], 'qmi-1', kerahatPrefs, morningTime).every(
      (event) => event.timestamp > morningTime,
    ),
  ).toBe(true);
  const midnightDay = { ...day, sunrise: '00:05' };
  const beforeMidnight = Date.parse('2026-10-07T19:00:00Z');
  expect(planNotifications([midnightDay], 'qmi-1', kerahatPrefs, beforeMidnight)[0]).toMatchObject({
    prayer: 'kerahat-morning',
    timestamp: Date.parse('2026-10-07T19:50:00Z'),
  });
});

test('reconciliation cancels removed kerahat choices and replaces alerts when durations change', () => {
  const day = days[7]!;
  const previous = planNotifications([day], 'qmi-1', kerahatPrefs, now);
  const pending = previous.map((event) => ({
    id: event.id,
    fingerprint: notificationFingerprint(event),
  }));
  const desired = planNotifications(
    [day],
    'qmi-1',
    {
      ...kerahatPrefs,
      kerahatOffsets: [5],
    },
    now,
    60,
    { morning: 45, noon: 30, evening: 45 },
  );
  const diff = reconciliationDiff(pending, desired);
  expect(diff.cancel).toEqual(
    previous
      .filter((event) => event.offset === 15 || event.prayer === 'kerahat-noon')
      .map((event) => event.id),
  );
  expect(diff.schedule.map((event) => event.prayer)).toEqual(['kerahat-noon']);
  expect(reconciliationDiff(pending, []).cancel).toHaveLength(previous.length);
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
    planSolarCountdown(records, 'qmi-1', false, { morning: 45, noon: 10, evening: 45 }),
  ).toEqual({ kerahat: [] });
});

test('persistent kerahat plan uses each selected duration and actual sunset', () => {
  const record = days[7]!;
  const plan = planSolarCountdown([record], 'qmi-1', true, { morning: 20, noon: 10, evening: 60 });
  expect(plan.kerahat).toHaveLength(3);
  expect(plan.kerahat.map((window) => (window.end - window.start) / 60_000)).toEqual([20, 10, 60]);
  expect(
    planSolarCountdown([record], 'qmi-1', true, { morning: 0, noon: 10, evening: 0 }).kerahat.map(
      (window) => window.name,
    ),
  ).toEqual(['Zəval']);
  expect(plan.kerahat[2]!.end).toBe(atTime(record.date, record.sunset!));
  expect(plan.kerahat[2]!.end).not.toBe(atTime(record.date, record.maghrib!));
});

test('solar panel never uses another city or an unverified endpoint', () => {
  const records = days.slice(7, 9);
  const durations = { morning: 45, noon: 10, evening: 45 };
  expect(planSolarCountdown(records, 'qmi-20', true, durations)).toEqual({ kerahat: [] });
  expect(
    planSolarCountdown(
      records.map((day) => ({ ...day, verified: false })),
      'qmi-1',
      true,
      durations,
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

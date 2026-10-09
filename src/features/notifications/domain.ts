import { DateTime } from 'luxon';
import {
  DAILY_PRAYERS,
  LABELS,
  REMINDER_EVENTS,
  TIMEZONE,
  type ReminderEvent,
} from '../../constants/prayers';
import type { PrayerDay } from '../../types/data';
import { atTime } from '../../utils/time';
export type ReminderPreferences = {
  enabled: boolean;
  atPrayerTime: boolean;
  ongoingCountdown: boolean;
  offsets: Record<ReminderEvent, number[]>;
  sound: 'silent' | 'default' | 'tone';
  vibration: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
};
export type PlannedNotification = {
  id: string;
  timestamp: number;
  title: string;
  body: string;
  locationId: string;
  prayer: ReminderEvent;
  date: string;
  offset: number;
  sound: ReminderPreferences['sound'];
  vibration: boolean;
};
export const defaultReminders: ReminderPreferences = {
  enabled: false,
  atPrayerTime: true,
  ongoingCountdown: true,
  offsets: { imsak: [], fajr: [10], dhuhr: [10], asr: [10], maghrib: [10], isha: [10] },
  sound: 'default',
  vibration: true,
  quietHours: { enabled: false, start: '23:00', end: '05:00' },
};
export function notificationId(
  locationId: string,
  date: string,
  prayer: ReminderEvent,
  offset: number,
) {
  return `nurvaxt:${locationId}:${date}:${prayer}:${offset}`;
}
export function isQuiet(timestamp: number, quiet: ReminderPreferences['quietHours']) {
  if (!quiet.enabled) return false;
  const time = DateTime.fromMillis(timestamp, { zone: TIMEZONE }).toFormat('HH:mm');
  if (quiet.start === quiet.end) return true;
  return quiet.start < quiet.end
    ? time >= quiet.start && time < quiet.end
    : time >= quiet.start || time < quiet.end;
}
export function planNotifications(
  days: PrayerDay[],
  locationId: string,
  prefs: ReminderPreferences,
  now: number,
  limit = 60,
): PlannedNotification[] {
  if (!prefs.enabled) return [];
  const events = new Map<string, PlannedNotification>();
  for (const day of days) {
    if (!day.verified || day.locationId !== locationId) continue;
    for (const prayer of REMINDER_EVENTS) {
      const time = day[prayer];
      if (!time) continue;
      const offsets = new Set(prefs.offsets[prayer]);
      if (prayer !== 'imsak') {
        offsets.delete(0);
        if (prefs.atPrayerTime) offsets.add(0);
      }
      for (const offset of offsets) {
        if (
          !Number.isInteger(offset) ||
          offset < 0 ||
          offset > 120 ||
          (prayer === 'imsak' && ![0, 5, 10, 15].includes(offset))
        )
          continue;
        const timestamp = atTime(day.date, time) - offset * 60_000;
        if (timestamp <= now || isQuiet(timestamp, prefs.quietHours)) continue;
        const name = LABELS[prayer];
        const body =
          prayer === 'imsak'
            ? offset
              ? `İmsak vaxtına ${offset} dəqiqə qalıb.`
              : 'İmsak vaxtı daxil oldu.'
            : offset
              ? `${name} namazına ${offset} dəqiqə qalıb.`
              : `${name} namazının vaxtı daxil oldu.`;
        const id = notificationId(locationId, day.date, prayer, offset);
        events.set(id, {
          id,
          timestamp,
          title: 'NurVaxt',
          body,
          locationId,
          prayer,
          date: day.date,
          offset,
          sound: prefs.sound,
          vibration: prefs.vibration,
        });
      }
    }
  }
  return [...events.values()]
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
    .slice(0, limit);
}
export type CountdownPrayer = {
  name: string;
  date: string;
  time: string;
  timestamp: number;
  previousTimestamp: number | null;
};
// Independent of reminder offsets: the ongoing timer always follows the five daily prayers.
export function planCountdown(days: PrayerDay[], locationId: string): CountdownPrayer[] {
  const events = days
    .filter((day) => day.verified && day.locationId === locationId)
    .flatMap((day) =>
      DAILY_PRAYERS.flatMap((prayer) =>
        day[prayer]
          ? [
              {
                name: LABELS[prayer],
                date: day.date,
                time: day[prayer]!,
                timestamp: atTime(day.date, day[prayer]!),
              },
            ]
          : [],
      ),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  return events.map((event, index) => ({
    ...event,
    previousTimestamp: events[index - 1]?.timestamp ?? null,
  }));
}
export function notificationFingerprint(event: PlannedNotification) {
  return JSON.stringify([event.timestamp, event.body, event.sound, event.vibration]);
}
export type PendingNotification = { id: string; fingerprint: string };
export function reconciliationDiff(pending: PendingNotification[], desired: PlannedNotification[]) {
  const expected = new Map(desired.map((n) => [n.id, notificationFingerprint(n)]));
  const actual = new Map(pending.map((n) => [n.id, n.fingerprint]));
  return {
    cancel: pending
      .filter((n) => n.id.startsWith('nurvaxt:') && expected.get(n.id) !== n.fingerprint)
      .map((n) => n.id),
    schedule: desired.filter((n) => actual.get(n.id) !== notificationFingerprint(n)),
  };
}

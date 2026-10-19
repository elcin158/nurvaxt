import { DateTime } from 'luxon';
import { TIMEZONE } from '../../constants/prayers';
import type { PrayerDay } from '../../types/data';
import { atTime } from '../../utils/time';

const MINUTE = 60_000;

export type KerahatWindow = {
  id: 'morning' | 'noon' | 'evening';
  title: string;
  start: number;
  end: number;
};

export type KerahatDurationMinutes = Record<KerahatWindow['id'], number>;
export const MAX_KERAHAT_MINUTES = 120;
export const defaultKerahatDurations: KerahatDurationMinutes = {
  morning: 45,
  noon: 10,
  evening: 45,
};

/** Hanafi estimates used by the displays and optional reminders, not official QMİ prayer records. */
export function kerahatWindows(
  day: PrayerDay | undefined,
  durations: KerahatDurationMinutes = defaultKerahatDurations,
): KerahatWindow[] {
  if (!day?.verified) return [];
  const windows: KerahatWindow[] = [];
  // A period set to zero minutes is left out instead of drawn as an empty interval.
  if (day.sunrise && durations.morning > 0) {
    const start = atTime(day.date, day.sunrise);
    windows.push({
      id: 'morning',
      title: 'Günçıxma',
      start,
      end: start + durations.morning * MINUTE,
    });
  }
  if (day.dhuhr && durations.noon > 0) {
    const end = atTime(day.date, day.dhuhr);
    windows.push({ id: 'noon', title: 'Zəval', start: end - durations.noon * MINUTE, end });
  }
  // Sunset is a separate source field: QMİ's Məğrib can be later than actual sunset.
  if (day.sunset && durations.evening > 0) {
    const end = atTime(day.date, day.sunset);
    windows.push({
      id: 'evening',
      title: 'Günbatımı',
      start: end - durations.evening * MINUTE,
      end,
    });
  }
  return windows.sort((a, b) => a.start - b.start);
}

/** Kərahət is reported while it runs; nothing announces it in advance. */
export function kerahatStatus(windows: KerahatWindow[], now: number) {
  const active = windows.find((window) => now >= window.start && now < window.end);
  const next = windows.find((window) => window.start > now);
  const remaining = active ? active.end - now : next ? next.start - now : 0;
  return { active, next, remaining };
}

export function solarClock(timestamp: number) {
  return DateTime.fromMillis(timestamp, { zone: TIMEZONE }).toFormat('HH:mm');
}

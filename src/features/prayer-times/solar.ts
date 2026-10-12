import { DateTime } from 'luxon';
import { TIMEZONE } from '../../constants/prayers';
import type { PrayerDay } from '../../types/data';
import { atTime } from '../../utils/time';

const MINUTE = 60_000;
export const KERAHAT_SOURCE_URL =
  'https://fetva.diyanet.gov.tr/tr/fetva/mekruh-vakitler-hangileridir-hangi-vakitlerde-kaza-ve-hangi-vakitlerde-nafile-namaz-kilinmaz/0193c42d-52b7-7186-d5b4-f1d3c950ad73';

export type KerahatWindow = {
  id: 'morning' | 'noon' | 'evening';
  title: string;
  start: number;
  end: number;
};

export type KerahatWarningMinutes = Record<KerahatWindow['id'], number>;
export const MAX_KERAHAT_WARNING_MINUTES = 120;
export const defaultKerahatWarnings: KerahatWarningMinutes = {
  morning: 45,
  noon: 45,
  evening: 45,
};

/** Display-only Hanafi estimates, not additional official QMİ prayer records or alarms. */
export function kerahatWindows(day: PrayerDay | undefined): KerahatWindow[] {
  if (!day?.verified) return [];
  const windows: KerahatWindow[] = [];
  if (day.sunrise) {
    const start = atTime(day.date, day.sunrise);
    windows.push({ id: 'morning', title: 'Günçıxma', start, end: start + 45 * MINUTE });
  }
  if (day.dhuhr) {
    const end = atTime(day.date, day.dhuhr);
    windows.push({ id: 'noon', title: 'Zəval', start: end - 10 * MINUTE, end });
  }
  // Sunset is a separate source field: QMİ's Məğrib can be later than actual sunset.
  if (day.sunset) {
    const end = atTime(day.date, day.sunset);
    windows.push({ id: 'evening', title: 'Günbatımı', start: end - 45 * MINUTE, end });
  }
  return windows.sort((a, b) => a.start - b.start);
}

export function kerahatStatus(
  windows: KerahatWindow[],
  now: number,
  warnings: KerahatWarningMinutes = defaultKerahatWarnings,
) {
  const active = windows.find((window) => now >= window.start && now < window.end);
  const next = windows.find((window) => window.start > now);
  const remaining = active ? active.end - now : next ? next.start - now : 0;
  const approaching = !active && !!next && remaining <= warnings[next.id] * MINUTE;
  return { active, next, remaining, approaching };
}

export function solarClock(timestamp: number) {
  return DateTime.fromMillis(timestamp, { zone: TIMEZONE }).toFormat('HH:mm');
}

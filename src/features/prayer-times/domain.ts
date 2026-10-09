import { DAILY_PRAYERS, type PrayerField } from '../../constants/prayers';
import type { PrayerDay } from '../../types/data';
import { atTime, shiftDate } from '../../utils/time';
import { DateTime } from 'luxon';
import { TIMEZONE } from '../../constants/prayers';
export type PrayerOccurrence = {
  field: PrayerField;
  time: string;
  date: string;
  timestamp: number;
  previousTimestamp: number | null;
};
export function prayerUrgency(remaining: number): 'normal' | 'soon' | 'imminent' {
  if (remaining > 0 && remaining <= 15 * 60_000) return 'imminent';
  if (remaining > 0 && remaining <= 30 * 60_000) return 'soon';
  return 'normal';
}
export function nextPrayer(days: PrayerDay[], now: number): PrayerOccurrence | null {
  const today = DateTime.fromMillis(now, { zone: TIMEZONE }).toISODate()!;
  const allowed = new Set([today, shiftDate(today, 1)]);
  const occurrences = days
    .filter((d) => d.verified && allowed.has(d.date))
    .flatMap((day) =>
      DAILY_PRAYERS.flatMap((field) =>
        day[field]
          ? [{ field, time: day[field]!, date: day.date, timestamp: atTime(day.date, day[field]!) }]
          : [],
      ),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  const index = occurrences.findIndex((event) => event.timestamp > now);
  if (index < 0) return null;
  return { ...occurrences[index]!, previousTimestamp: occurrences[index - 1]?.timestamp ?? null };
}
export function countdown(occurrence: PrayerOccurrence | null, now: number) {
  if (!occurrence) return { remaining: 0, progress: 0 };
  const remaining = Math.max(0, occurrence.timestamp - now);
  const start = occurrence.previousTimestamp;
  const progress =
    start === null ? 0 : Math.min(1, Math.max(0, (now - start) / (occurrence.timestamp - start)));
  return { remaining, progress };
}

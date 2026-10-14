import { REMINDER_EVENTS, type PrayerField } from '../../constants/prayers';
import type { PrayerDay } from '../../types/data';
import { atTime, shiftDate } from '../../utils/time';
import { DateTime } from 'luxon';
import { TIMEZONE } from '../../constants/prayers';
export type PrayerOccurrence = {
  field: PrayerField;
  phase: 'start' | 'end';
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
/** İmsak, prayer starts and Sübh's verified sunrise deadline, shared by the app and native plan. */
export function prayerCountdownTimeline(days: PrayerDay[]): PrayerOccurrence[] {
  const occurrences = days
    .filter((day) => day.verified)
    .flatMap((day) => {
      const starts = REMINDER_EVENTS.flatMap((field) =>
        day[field]
          ? [
              {
                field,
                phase: 'start' as const,
                time: day[field]!,
                date: day.date,
                timestamp: atTime(day.date, day[field]!),
              },
            ]
          : [],
      );
      if (!day.fajr || !day.sunrise) return starts;
      const start = atTime(day.date, day.fajr);
      const end = atTime(day.date, day.sunrise);
      if (end <= start) return starts;
      return [
        ...starts,
        {
          field: 'fajr' as const,
          phase: 'end' as const,
          time: day.sunrise,
          date: day.date,
          timestamp: end,
        },
      ];
    })
    .sort((a, b) => a.timestamp - b.timestamp);
  return occurrences.map((event, index) => ({
    ...event,
    previousTimestamp: occurrences[index - 1]?.timestamp ?? null,
  }));
}

function nextOccurrence(
  days: PrayerDay[],
  now: number,
  includeCountdownEvents: boolean,
): PrayerOccurrence | null {
  const today = DateTime.fromMillis(now, { zone: TIMEZONE }).toISODate()!;
  // Yesterday supplies the İşa anchor for progress toward today's İmsak.
  const allowed = new Set([shiftDate(today, -1), today, shiftDate(today, 1)]);
  const occurrences = prayerCountdownTimeline(days.filter((day) => allowed.has(day.date))).filter(
    (event) => includeCountdownEvents || (event.phase === 'start' && event.field !== 'imsak'),
  );
  const index = occurrences.findIndex((event) => event.timestamp > now);
  if (index < 0) return null;
  return { ...occurrences[index]!, previousTimestamp: occurrences[index - 1]?.timestamp ?? null };
}
export function nextPrayer(days: PrayerDay[], now: number): PrayerOccurrence | null {
  return nextOccurrence(days, now, false);
}
export function nextPrayerCountdown(days: PrayerDay[], now: number): PrayerOccurrence | null {
  return nextOccurrence(days, now, true);
}
export function countdown(occurrence: PrayerOccurrence | null, now: number) {
  if (!occurrence) return { remaining: 0, progress: 0 };
  const remaining = Math.max(0, occurrence.timestamp - now);
  const start = occurrence.previousTimestamp;
  const progress =
    start === null ? 0 : Math.min(1, Math.max(0, (now - start) / (occurrence.timestamp - start)));
  return { remaining, progress };
}

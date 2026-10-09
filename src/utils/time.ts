import { DateTime } from 'luxon';
import { TIMEZONE } from '../constants/prayers';
import { MONTHS, WEEKDAYS, HIJRI_MONTHS } from '../localization/dates';
export const bakuNow = () => DateTime.now().setZone(TIMEZONE);
export const todayISO = () => bakuNow().toISODate()!;
export function atTime(date: string, time: string): number {
  const value = DateTime.fromISO(`${date}T${time}:00`, { zone: TIMEZONE });
  if (!value.isValid) throw new Error('Tarix və ya vaxt düzgün deyil.');
  return value.toMillis();
}
export function shiftDate(date: string, days: number) {
  return DateTime.fromISO(date, { zone: TIMEZONE }).plus({ days }).toISODate()!;
}
export function formatDate(date: string) {
  const value = DateTime.fromISO(date, { zone: TIMEZONE });
  return `${value.day} ${MONTHS[value.month - 1]} ${value.year}, ${WEEKDAYS[value.weekday - 1]}`;
}
export function formatTime(time: string, mode: '24' | '12') {
  if (mode === '24') return time;
  const value = DateTime.fromFormat(time, 'HH:mm');
  return `${value.toFormat('h:mm')} ${value.hour < 12 ? 'g.ə.' : 'g.s.'}`;
}
export function formatCountdown(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}
export function hijriDate(date: string, adjustment: number) {
  const value = DateTime.fromISO(date, { zone: TIMEZONE }).plus({ days: adjustment });
  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-civil', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: TIMEZONE,
    });
    if (formatter.resolvedOptions().calendar !== 'islamic-civil')
      return 'Hicri tarix bu cihazda hesablanmır';
    const parts = formatter.formatToParts(value.toJSDate());
    const part = (type: string) => parts.find((p) => p.type === type)?.value;
    return `${part('day')} ${HIJRI_MONTHS[Number(part('month')) - 1]} ${part('year')}`;
  } catch {
    return 'Hicri tarix bu cihazda hesablanmır';
  }
}

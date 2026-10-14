import { DateTime } from 'luxon';
import {
  nextPrayer,
  nextPrayerCountdown,
  countdown,
  prayerUrgency,
} from '../src/features/prayer-times/domain';
import { atTime, formatCountdown, formatDate, shiftDate } from '../src/utils/time';
import { datasetSchema } from '../src/types/data';
import dataset from '../data/verified/2026.json';
import locations from '../data/locations.json';
const allDays = datasetSchema.parse(dataset).records;
const days = allDays.filter((day) => day.locationId === 'qmi-1');
const stamp = (value: string) => DateTime.fromISO(value, { zone: 'Asia/Baku' }).toMillis();
describe('official next-prayer engine', () => {
  test('every selected region drives its own official prayer times', () => {
    for (const location of locations) {
      const region = allDays.filter((day) => day.locationId === location.id);
      const day = region.find((row) => row.date === '2026-10-08')!;
      expect(day).toBeDefined();
      expect(nextPrayer(region, stamp('2026-10-08T00:00:00'))).toMatchObject({
        field: 'fajr',
        time: day.fajr,
      });
      expect(nextPrayer(region, atTime(day.date, day.fajr!))).toMatchObject({
        field: 'dhuhr',
        time: day.dhuhr,
      });
    }
  });
  test('urgency changes exactly at 30 and 15 minutes and resets for the next prayer', () => {
    expect(prayerUrgency(30 * 60_000 + 1)).toBe('normal');
    expect(prayerUrgency(30 * 60_000)).toBe('soon');
    expect(prayerUrgency(15 * 60_000 + 1)).toBe('soon');
    expect(prayerUrgency(15 * 60_000)).toBe('imminent');
    expect(prayerUrgency(1)).toBe('imminent');
    expect(prayerUrgency(0)).toBe('normal');
    expect(prayerUrgency(-1)).toBe('normal');
  });
  test('date labels remain Azerbaijani even without ICU Azerbaijani locale data', () => {
    expect(formatDate('2026-10-08')).toBe('8 oktyabr 2026, cümə axşamı');
  });
  test('daily prayer selection excludes İmsak and sunrise', () => {
    expect(nextPrayer(days, stamp('2026-10-08T05:19:00'))?.field).toBe('fajr');
    expect(nextPrayer(days, stamp('2026-10-08T05:25:00'))?.field).toBe('dhuhr');
  });
  test('countdown advances from İşa to İmsak, then Sübh in every region', () => {
    for (const location of locations) {
      const region = allDays.filter((day) => day.locationId === location.id);
      const previousDay = region.find((day) => day.date === '2026-10-08')!;
      const day = region.find((day) => day.date === '2026-10-09')!;
      const isha = atTime(previousDay.date, previousDay.isha!);
      const imsak = atTime(day.date, day.imsak!);
      const fajr = atTime(day.date, day.fajr!);
      expect(nextPrayerCountdown(region, isha - 1)?.field).toBe('isha');
      const afterIsha = nextPrayerCountdown(region, isha);
      expect(afterIsha).toMatchObject({
        field: 'imsak',
        phase: 'start',
        date: day.date,
        time: day.imsak,
        timestamp: imsak,
        previousTimestamp: isha,
      });
      expect(countdown(afterIsha, isha)).toEqual({ remaining: imsak - isha, progress: 0 });
      expect(nextPrayerCountdown(region, imsak - 1)).toEqual(afterIsha);
      const afterImsak = nextPrayerCountdown(region, imsak);
      expect(afterImsak).toMatchObject({
        field: 'fajr',
        phase: 'start',
        timestamp: fajr,
        previousTimestamp: imsak,
      });
      expect(countdown(afterImsak, imsak)).toEqual({ remaining: fajr - imsak, progress: 0 });
      expect(nextPrayerCountdown(region, fajr - 1)).toEqual(afterImsak);
    }
  });
  test('missing İmsak falls back to the verified Sübh time', () => {
    const previousDay = days.find((day) => day.date === '2026-10-08')!;
    const day = days.find((day) => day.date === '2026-10-09')!;
    expect(
      nextPrayerCountdown(
        [previousDay, { ...day, imsak: null }],
        atTime(previousDay.date, previousDay.isha!),
      ),
    ).toMatchObject({
      field: 'fajr',
      time: day.fajr,
      previousTimestamp: atTime(previousDay.date, previousDay.isha!),
    });
  });
  test('Sübh countdown switches from its start to its sunrise deadline in every region', () => {
    for (const location of locations) {
      const day = allDays.find(
        (row) => row.locationId === location.id && row.date === '2026-10-08',
      )!;
      const start = atTime(day.date, day.fajr!);
      const end = atTime(day.date, day.sunrise!);
      expect(nextPrayerCountdown([day], start - 1)).toMatchObject({
        field: 'fajr',
        phase: 'start',
        timestamp: start,
      });
      const active = nextPrayerCountdown([day], start);
      expect(active).toMatchObject({
        field: 'fajr',
        phase: 'end',
        time: day.sunrise,
        timestamp: end,
        previousTimestamp: start,
      });
      expect(countdown(active, start)).toEqual({ remaining: end - start, progress: 0 });
      expect(nextPrayerCountdown([day], end - 1)?.phase).toBe('end');
      expect(nextPrayerCountdown([day], end)).toMatchObject({ field: 'dhuhr', phase: 'start' });
    }
  });
  test('Sübh deadline requires both verified endpoints in the same record', () => {
    const day = days.find((row) => row.date === '2026-10-08')!;
    const duringFajr = atTime(day.date, '06:00');
    for (const record of [
      { ...day, sunrise: null },
      { ...day, fajr: null },
      { ...day, sunrise: day.fajr },
    ]) {
      expect(nextPrayerCountdown([record], duringFajr)?.field).toBe('dhuhr');
    }
    expect(nextPrayerCountdown([{ ...day, verified: false }], duringFajr)).toBeNull();
    expect(
      nextPrayerCountdown(
        days.filter((row) => row.date !== '2026-10-09'),
        stamp('2026-10-08T23:00:00'),
      ),
    ).toBeNull();
    expect(nextPrayerCountdown(days, stamp('2026-12-31T23:00:00'))).toBeNull();
  });
  test('rolls past İşa to the next official day', () => {
    const next = nextPrayer(days, stamp('2026-10-08T23:59:59'));
    expect(next?.date).toBe('2026-10-09');
    expect(next?.time).toBe('05:26');
    expect(nextPrayer(days, stamp('2026-10-09T00:00:00'))?.timestamp).toBe(next?.timestamp);
  });
  test.each(['2026-10-09', '2026-11-01', '2026-12-01'])(
    'overnight progress stays continuous across midnight on %s in every region',
    (date) => {
      const midnight = atTime(date, '00:00');
      for (const location of locations) {
        const region = allDays.filter((day) => day.locationId === location.id);
        const previousDay = region.find((day) => day.date === shiftDate(date, -1))!;
        const day = region.find((day) => day.date === date)!;
        const start = atTime(previousDay.date, previousDay.isha!);
        for (const select of [nextPrayer, nextPrayerCountdown]) {
          const field = select === nextPrayer ? 'fajr' : 'imsak';
          const end = atTime(day.date, day[field]!);
          const before = select(region, midnight - 1);
          const after = select(region, midnight);
          expect(before).toMatchObject({
            field,
            phase: 'start',
            timestamp: end,
            previousTimestamp: start,
          });
          expect(after).toEqual(before);
          expect(countdown(after, midnight).progress).toBeGreaterThan(0);
          expect(countdown(after, midnight).progress).toBeLessThan(1);
          expect(countdown(after, midnight).progress).toBeCloseTo(
            countdown(before, midnight - 1).progress,
            6,
          );
          expect(countdown(select(region, (start + end) / 2), (start + end) / 2).progress).toBe(
            0.5,
          );
        }
      }
    },
  );
  test('overnight progress requires a verified previous day and never reuses a distant day', () => {
    const previousDay = days.find((day) => day.date === '2026-10-08')!;
    const day = days.find((day) => day.date === '2026-10-09')!;
    const distantDay = days.find((day) => day.date === '2026-10-07')!;
    const now = atTime(day.date, '02:00');
    for (const records of [
      [distantDay, day],
      [{ ...previousDay, verified: false }, day],
    ]) {
      const event = nextPrayerCountdown(records, now);
      expect(event).toMatchObject({ field: 'imsak', date: day.date, previousTimestamp: null });
      expect(countdown(event, now).progress).toBe(0);
    }
  });
  test('rolls across the newly verified month boundaries', () => {
    expect(nextPrayer(days, stamp('2026-10-31T23:00:00'))).toMatchObject({
      date: '2026-11-01',
      time: '05:49',
    });
    expect(nextPrayer(days, stamp('2026-11-30T23:00:00'))).toMatchObject({
      date: '2026-12-01',
      time: '06:19',
    });
  });
  test('returns missing-data state at the year boundary without reusing last year', () => {
    expect(nextPrayer(days, stamp('2026-12-31T23:00:00'))).toBeNull();
    expect(nextPrayer(days, stamp('2027-01-01T00:00:00'))).toBeNull();
    expect(nextPrayer([], stamp('2026-10-08T12:00:00'))).toBeNull();
  });
  test('never skips across a missing tomorrow to a distant record', () => {
    const sparse = days.filter((d) => d.date !== '2026-10-09');
    expect(nextPrayer(sparse, stamp('2026-10-08T23:00:00'))).toBeNull();
  });
  test('unverified records never drive countdowns', () => {
    expect(
      nextPrayer(
        days.map((d) => ({ ...d, verified: false })),
        stamp('2026-10-08T12:00:00'),
      ),
    ).toBeNull();
  });
  test('absolute timezone timestamps are independent of device zone', () => {
    expect(atTime('2026-10-08', '12:28')).toBe(Date.parse('2026-10-08T08:28:00Z'));
  });
  test('resumption recalculates from device clock and clamps negatives', () => {
    const next = nextPrayer(days, stamp('2026-10-08T12:00:00'))!;
    expect(countdown(next, next.timestamp - 1000).remaining).toBe(1000);
    expect(countdown(next, next.timestamp + 1000).remaining).toBe(0);
    expect(formatCountdown(-10)).toBe('00:00:00');
    expect(formatCountdown(3661000)).toBe('01:01:01');
  });
  test('Gregorian leap years and month boundaries', () => {
    expect(shiftDate('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDate('2026-02-28', 1)).toBe('2026-03-01');
  });
});

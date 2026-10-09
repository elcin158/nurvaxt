import { DateTime } from 'luxon';
import { nextPrayer, countdown, prayerUrgency } from '../src/features/prayer-times/domain';
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
  test('does not include İmsak or sunrise in daily prayer countdown', () => {
    expect(nextPrayer(days, stamp('2026-10-08T05:19:00'))?.field).toBe('fajr');
    expect(nextPrayer(days, stamp('2026-10-08T05:25:00'))?.field).toBe('dhuhr');
  });
  test('rolls past İşa to the next official day', () => {
    const next = nextPrayer(days, stamp('2026-10-08T23:59:59'));
    expect(next?.date).toBe('2026-10-09');
    expect(next?.time).toBe('05:26');
    expect(nextPrayer(days, stamp('2026-10-09T00:00:00'))?.timestamp).toBe(next?.timestamp);
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

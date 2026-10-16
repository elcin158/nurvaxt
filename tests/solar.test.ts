import { atTime } from '../src/utils/time';
import { kerahatStatus, kerahatWindows, solarClock } from '../src/features/prayer-times/solar';
import type { PrayerDay } from '../src/types/data';

const day: PrayerDay = {
  date: '2026-10-11',
  locationId: 'qmi-1',
  imsak: '05:25',
  fajr: '05:30',
  sunrise: '06:50',
  dhuhr: '12:25',
  asr: '16:20',
  sunset: '18:10',
  maghrib: '18:24',
  isha: '19:20',
  midnight: '23:45',
  sourceId: 'qmi',
  sourceVersion: 'test',
  verified: true,
};
const at = (time: string) => atTime(day.date, time);

test('Hanafi estimates use actual sunset rather than the later Məğrib field', () => {
  const windows = kerahatWindows(day);
  expect(
    windows.map((window) => [window.id, solarClock(window.start), solarClock(window.end)]),
  ).toEqual([
    ['morning', '06:50', '07:35'],
    ['noon', '12:15', '12:25'],
    ['evening', '17:25', '18:10'],
  ]);
});

test('every interval is active at its start and finished exactly at its end', () => {
  const windows = kerahatWindows(day);
  for (const window of windows) {
    expect(kerahatStatus(windows, window.start - 1).active).toBeUndefined();
    expect(kerahatStatus(windows, window.start).active?.id).toBe(window.id);
    expect(kerahatStatus(windows, window.end - 1).remaining).toBe(1);
    expect(kerahatStatus(windows, window.end).active).toBeUndefined();
  }
  expect(kerahatStatus(windows, at('18:10'))).toMatchObject({ next: undefined, remaining: 0 });
});

test('missing solar fields never fall back to another prayer or an unverified record', () => {
  expect(kerahatWindows(undefined)).toEqual([]);
  expect(kerahatWindows({ ...day, verified: false })).toEqual([]);
  expect(kerahatWindows({ ...day, sunrise: null, dhuhr: null, sunset: null })).toEqual([]);
  expect(kerahatWindows({ ...day, sunset: null }).map((window) => window.id)).toEqual([
    'morning',
    'noon',
  ]);
});

test('each period keeps its own configured length around the same solar endpoint', () => {
  const windows = kerahatWindows(day, { morning: 20, noon: 30, evening: 60 });
  expect(
    windows.map((window) => [window.id, solarClock(window.start), solarClock(window.end)]),
  ).toEqual([
    ['morning', '06:50', '07:10'],
    ['noon', '11:55', '12:25'],
    ['evening', '17:10', '18:10'],
  ]);
});

test('a period of zero minutes is left out instead of becoming an empty interval', () => {
  const windows = kerahatWindows(day, { morning: 0, noon: 10, evening: 0 });
  expect(windows.map((window) => window.id)).toEqual(['noon']);
  expect(kerahatStatus(windows, at('06:55')).active).toBeUndefined();
  expect(kerahatStatus(windows, at('12:20')).active?.id).toBe('noon');
});

test('solar timestamps stay in Asia/Baku independently of the device timezone', () => {
  expect(kerahatWindows(day)[0]!.start).toBe(Date.parse('2026-10-11T02:50:00Z'));
});

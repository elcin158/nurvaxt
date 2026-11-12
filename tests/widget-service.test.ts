import { Platform } from 'react-native';
import Alarm from '../modules/nurvaxt-alarm/src';
import { readDays } from '../src/database/repository';
import { defaultPreferences, usePreferences } from '../src/store/preferences';
import { synchronizeWidgets, pinWidget } from '../src/features/widgets/service';
import { prayerDaySchema, type PrayerDay } from '../src/types/data';
import dataset from '../data/verified/2026.json';

jest.mock('../modules/nurvaxt-alarm/src', () => ({
  __esModule: true,
  default: {
    replaceWidgetPlan: jest.fn(async () => {}),
    requestPinWidget: jest.fn(async () => true),
  },
}));
jest.mock('../src/database/repository', () => ({ readDays: jest.fn() }));
const day = prayerDaySchema.parse(dataset.records.find((entry) => entry.locationId === 'qmi-1'));
const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  usePreferences.setState({
    ...defaultPreferences,
    timeFormat: '12',
    reminders: { ...defaultPreferences.reminders, enabled: false },
  });
  jest.mocked(readDays).mockResolvedValue([day]);
});
afterEach(() => {
  Platform.OS = originalOS;
});

test('widgets synchronize even with notifications disabled and use the full bundled coverage', async () => {
  await synchronizeWidgets();
  expect(readDays).toHaveBeenCalledWith('qmi-1', '2026-10-01', '2026-12-31');
  expect(JSON.parse(jest.mocked(Alarm!.replaceWidgetPlan).mock.calls[0]![0])).toMatchObject({
    locationId: 'qmi-1',
    location: 'Bakı',
    timeFormat: '12',
    days: [{ date: day.date }],
  });
});

test('city changes during IO cannot publish the previous city and the next run applies current settings', async () => {
  let finish!: (days: PrayerDay[]) => void;
  jest.mocked(readDays).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const old = synchronizeWidgets();
  await Promise.resolve();
  usePreferences.setState({ locationId: 'qmi-2', timeFormat: '24' });
  const next = synchronizeWidgets();
  finish([day]);
  await Promise.all([old, next]);
  expect(Alarm!.replaceWidgetPlan).toHaveBeenCalledTimes(1);
  expect(JSON.parse(jest.mocked(Alarm!.replaceWidgetPlan).mock.calls[0]![0])).toMatchObject({
    locationId: 'qmi-2',
    timeFormat: '24',
    days: [],
  });
});

test('failed IO is recoverable and pinning first synchronizes the calendar', async () => {
  jest.mocked(readDays).mockRejectedValueOnce(new Error('unavailable'));
  await expect(synchronizeWidgets()).rejects.toThrow('unavailable');
  await expect(pinWidget('small')).resolves.toBe(true);
  expect(Alarm!.requestPinWidget).toHaveBeenCalledWith('small');
  expect(Alarm!.replaceWidgetPlan).toHaveBeenCalledTimes(1);
});

test('unsupported platforms do not read the database or call native widget functions', async () => {
  Platform.OS = 'ios';
  await synchronizeWidgets();
  await expect(pinWidget('compact')).resolves.toBe(false);
  expect(readDays).not.toHaveBeenCalled();
  expect(Alarm!.replaceWidgetPlan).not.toHaveBeenCalled();
});

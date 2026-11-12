import dataset from '../data/verified/2026.json';
import { createWidgetPlan, widgetRemaining } from '../src/features/widgets/domain';
import { datasetSchema } from '../src/types/data';
import { atTime } from '../src/utils/time';

const days = datasetSchema.parse(dataset).records;
const options = {
  bundle: 'test',
  locationId: 'qmi-1',
  location: 'Bakı',
  timeFormat: '24' as const,
};

test('widget calendar contains only verified data from the selected city and five daily prayers', () => {
  const day = days.find((entry) => entry.locationId === 'qmi-1' && entry.date === '2026-10-22')!;
  const plan = createWidgetPlan(
    [
      ...days.filter((entry) => entry.date === day.date),
      { ...day, date: '2026-10-23', verified: false },
      day,
    ],
    options,
  );
  expect(plan.days).toHaveLength(1);
  expect(plan.days[0]!.prayers.map((prayer) => [prayer.field, prayer.name])).toEqual([
    ['fajr', 'Sübh'],
    ['dhuhr', 'Zöhr'],
    ['asr', 'Əsr'],
    ['maghrib', 'Məğrib'],
    ['isha', 'İşa'],
  ]);
  expect(plan.days[0]!.prayers[2]).toEqual({
    field: 'asr',
    name: 'Əsr',
    time: day.asr,
    timestamp: atTime(day.date, day.asr!),
  });
  expect(plan).toMatchObject({ version: 1, ...options });
});

test('whole installed calendar is kept in order and no missing prayer time is inferred', () => {
  const city = days.filter((day) => day.locationId === options.locationId);
  const plan = createWidgetPlan([...city].reverse(), options);
  expect(plan.days).toHaveLength(92);
  expect(plan.days[0]!.date).toBe('2026-10-01');
  expect(plan.days.at(-1)!.date).toBe('2026-12-31');
  expect(createWidgetPlan([{ ...city[0]!, fajr: null }], options).days[0]!.prayers).toHaveLength(4);
  expect(createWidgetPlan(days, { ...options, locationId: 'qmi-999' }).days).toEqual([]);
});

test.each([
  [1, '1 dəq'],
  [60_000, '1 dəq'],
  [60_001, '2 dəq'],
  [38 * 60_000, '38 dəq'],
  [60 * 60_000, '1 s 0 dəq'],
  [605 * 60_000, '10 s 5 dəq'],
])('remaining duration rounds up without extra labels: %i', (milliseconds, expected) => {
  expect(widgetRemaining(milliseconds)).toBe(expected);
});

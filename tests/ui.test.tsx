import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme';
import { usePreferences, defaultPreferences } from '../src/store/preferences';
import { PrayerList } from '../src/features/prayer-times/PrayerList';
import { KerahatTimesCard } from '../src/features/prayer-times/KerahatTimesCard';
import { NextPrayerCard } from '../src/features/prayer-times/NextPrayerCard';
import { useActiveClock } from '../src/hooks/useActiveClock';
import { KerahatWarningSettings } from '../src/features/settings/KerahatWarningSettings';
import Calendar from '../app/(tabs)/calendar';
import Home from '../app/(tabs)/index';
import { router } from 'expo-router';
import { datasetSchema } from '../src/types/data';
import dataset from '../data/verified/2026.json';
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/hooks/useToday', () => ({ useToday: () => '2026-10-08' }));
jest.mock('../src/hooks/useActiveClock', () => ({
  useActiveClock: jest.fn(() => Date.parse('2026-10-08T02:50:00Z')),
}));
jest.mock('../src/hooks/usePrayerDays', () => ({
  usePrayerDays: (start: string, end = start) => {
    const city = require('../src/store/preferences').usePreferences(
      (state: { locationId: string }) => state.locationId,
    );
    return {
      data: require('../data/verified/2026.json').records.filter(
        (day: { date: string; locationId: string }) =>
          day.date >= start && day.date <= end && day.locationId === city,
      ),
      isPending: false,
      isError: false,
    };
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  usePreferences.setState(defaultPreferences);
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T02:50:00Z'));
});
test('home opens the selected source time and routes reminder setup only for prayer events', async () => {
  usePreferences.setState({ showKerahat: true });
  await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('9 vaxt · 24 saat')).toBeOnTheScreen();
  expect(screen.getByLabelText('Günbatımı, 18:11')).toBeOnTheScreen();
  expect(screen.getByLabelText('Məğrib, 18:25')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Əsr, 16:27'));
  expect(screen.getByText('Bakı · 8 oktyabr 2026, cümə axşamı')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Xatırlatmaları tənzimlə'));
  expect(router.push).toHaveBeenCalledWith('/reminders');
  await fireEvent.press(screen.getByLabelText('Günçıxma, 06:44'));
  expect(screen.queryByText('Xatırlatmaları tənzimlə')).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Bağla'));
  await fireEvent.press(screen.getByLabelText('Növbəti gün'));
  expect(screen.getByLabelText('Günçıxma, 06:45')).toBeOnTheScreen();
  expect(screen.getByText(/06:45\s*–\s*07:30/)).toBeOnTheScreen();
});

test('home respects hidden fields and twelve-hour times, then replaces details after a city change', async () => {
  usePreferences.setState({ timeFormat: '12', visibleFields: ['fajr', 'asr', 'sunset'] });
  await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('3 vaxt · 12 saat')).toBeOnTheScreen();
  expect(screen.getByText('6:11 g.s.')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Məğrib, 18:25')).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Əsr, 16:27'));
  await act(async () => usePreferences.getState().setLocation('qmi-20'));
  expect(screen.queryByText('Bakı · 8 oktyabr 2026, cümə axşamı')).not.toBeOnTheScreen();
  expect(screen.getByLabelText('Əsr, 16:40')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Əsr, 16:40'));
  expect(screen.getByText('Gəncə · 8 oktyabr 2026, cümə axşamı')).toBeOnTheScreen();
});
test('switching from Bakı to Gəncə replaces the calendar with that city’s source times', async () => {
  await render(
    <ThemeProvider>
      <Calendar />
    </ThemeProvider>,
  );
  expect(screen.getByText('16:27')).toBeOnTheScreen();
  await act(async () => usePreferences.getState().setLocation('qmi-20'));
  expect(screen.getByText('16:40')).toBeOnTheScreen();
  expect(screen.queryByText('16:27')).not.toBeOnTheScreen();
});
test('prayer rows use all distinct source fields and an accessible next label', async () => {
  const day = datasetSchema.parse(dataset).records[7]!;
  await render(
    <ThemeProvider>
      <PrayerList day={day} upcoming="asr" />
    </ThemeProvider>,
  );
  expect(screen.getByText('05:20')).toBeOnTheScreen();
  expect(screen.getByText('05:25')).toBeOnTheScreen();
  expect(screen.getByText('18:11')).toBeOnTheScreen();
  expect(screen.getByText('18:25')).toBeOnTheScreen();
  expect(screen.getByLabelText('Əsr, 16:27, növbəti namaz')).toBeOnTheScreen();
});
test('calendar navigation covers November and December then shows missing January', async () => {
  await render(
    <ThemeProvider>
      <Calendar />
    </ThemeProvider>,
  );
  expect(screen.getByText('16:27')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Növbəti ay'));
  expect(screen.getByText('15:56')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Növbəti ay'));
  expect(screen.getByText('15:34')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Növbəti ay'));
  expect(screen.getByText('Bu tarix üçün təqvim yoxdur')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Əvvəlki ay'));
  expect(screen.getByText('15:34')).toBeOnTheScreen();
});
test('kerahat card appears only when enabled and is hidden again when disabled', async () => {
  await render(
    <ThemeProvider>
      <KerahatTimesCard />
    </ThemeProvider>,
  );
  expect(screen.queryByText('Kərahət vaxtları')).not.toBeOnTheScreen();
  await act(async () => usePreferences.getState().set({ showKerahat: true }));
  expect(screen.getByText('Kərahət vaxtları')).toBeOnTheScreen();
  expect(screen.getByText('Kərahət vaxtıdır')).toBeOnTheScreen();
  expect(screen.getByText('06:44 – 07:29')).toBeOnTheScreen();
  await act(async () => usePreferences.getState().set({ showKerahat: false }));
  expect(screen.queryByText('Kərahət vaxtları')).not.toBeOnTheScreen();
});

test('daytime hero keeps the next prayer without a separate sunrise countdown', async () => {
  await render(
    <ThemeProvider>
      <NextPrayerCard onPrayerChange={jest.fn()} />
    </ThemeProvider>,
  );
  expect(screen.getByText('NÖVBƏTİ NAMAZ')).toBeOnTheScreen();
  expect(screen.getByText('Zöhr')).toBeOnTheScreen();
  expect(screen.queryByText('Günçıxma')).not.toBeOnTheScreen();
});

test('after İşa the hero keeps Sübh primary without a separate sunrise section', async () => {
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T17:00:00Z'));
  const onPrayerChange = jest.fn();
  await render(
    <ThemeProvider>
      <NextPrayerCard onPrayerChange={onPrayerChange} />
    </ThemeProvider>,
  );
  expect(screen.getByText('Sübh')).toBeOnTheScreen();
  expect(onPrayerChange).toHaveBeenLastCalledWith('fajr', '2026-10-09', 'start');
  expect(screen.queryByText('Günçıxma')).not.toBeOnTheScreen();
  expect(screen.queryByText('Sabah · 06:45')).not.toBeOnTheScreen();
  expect(screen.queryByLabelText('İşadan günçıxmaya qədər keçən vaxt')).not.toBeOnTheScreen();
});
test('Sübh hero counts down to sunrise and changes to Zöhr exactly at sunrise', async () => {
  const day = datasetSchema.parse(dataset).records[7]!;
  const onPrayerChange = jest.fn();
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T02:00:00Z'));
  const view = await render(
    <ThemeProvider>
      <NextPrayerCard onPrayerChange={onPrayerChange} />
    </ThemeProvider>,
  );
  expect(screen.getByText('SÜBH NAMAZI')).toBeOnTheScreen();
  expect(screen.getByText('Sübhün bitməsinə qalan vaxt')).toBeOnTheScreen();
  expect(screen.getByText(`Günçıxma · ${day.sunrise}`)).toBeOnTheScreen();
  expect(screen.getByText('00:44:00')).toBeOnTheScreen();
  expect(screen.queryByText('Zöhr')).not.toBeOnTheScreen();
  expect(onPrayerChange).toHaveBeenLastCalledWith('fajr', '2026-10-08', 'end');
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T02:44:00Z'));
  await view.rerender(
    <ThemeProvider>
      <NextPrayerCard onPrayerChange={onPrayerChange} />
    </ThemeProvider>,
  );
  expect(screen.getByText('Zöhr')).toBeOnTheScreen();
  expect(screen.queryByText('Sübhün bitməsinə qalan vaxt')).not.toBeOnTheScreen();
  expect(onPrayerChange).toHaveBeenLastCalledWith('dhuhr', '2026-10-08', 'start');
});
test('active Sübh row uses an ongoing label and retains its prayer start time', async () => {
  const day = datasetSchema.parse(dataset).records[7]!;
  await render(
    <ThemeProvider>
      <PrayerList day={day} upcoming="fajr" ending />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText('Sübh, 05:25, vaxtı davam edir')).toBeOnTheScreen();
  expect(screen.getByText('Vaxtı davam edir')).toBeOnTheScreen();
  expect(screen.queryByText('Növbəti namaz')).not.toBeOnTheScreen();
});
test('kerahat source details stay available behind the information button', async () => {
  usePreferences.setState({ showKerahat: true });
  await render(
    <ThemeProvider>
      <KerahatTimesCard />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByLabelText('Kərahət vaxtları haqqında'));
  expect(screen.getByText('Mənbə: Diyanət · kərahət vaxtları')).toBeOnTheScreen();
});

test('kerahat uses the selected warning threshold and omits the redundant subtitle', async () => {
  usePreferences.setState({ showKerahat: true });
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T07:45:00Z'));
  await render(
    <ThemeProvider>
      <KerahatTimesCard />
    </ThemeProvider>,
  );
  expect(screen.getByText('Kərahət yaxınlaşır')).toBeOnTheScreen();
  expect(screen.queryByText('Bu gün · Hənəfi · təxmini')).not.toBeOnTheScreen();
  await act(async () =>
    usePreferences.getState().set({ kerahatWarnings: { morning: 45, noon: 15, evening: 45 } }),
  );
  expect(screen.queryByText('Kərahət yaxınlaşır')).not.toBeOnTheScreen();
  await act(async () =>
    usePreferences.getState().set({ kerahatWarnings: { morning: 45, noon: 40, evening: 45 } }),
  );
  expect(screen.getByText('Kərahət yaxınlaşır')).toBeOnTheScreen();
});

test('warning controls support exact input and adjust only the selected period', async () => {
  await render(
    <ThemeProvider>
      <KerahatWarningSettings />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText('Günçıxma xəbərdarlığı, dəqiqə')).toHaveProp('value', '45');
  const noon = screen.getByLabelText('Zəval xəbərdarlığı, dəqiqə');
  await fireEvent.changeText(noon, '37');
  await fireEvent(noon, 'blur');
  expect(usePreferences.getState().kerahatWarnings).toEqual({ morning: 45, noon: 37, evening: 45 });
  await fireEvent.press(screen.getByLabelText('Günbatımı xəbərdarlığını 5 dəqiqə artır'));
  expect(usePreferences.getState().kerahatWarnings).toEqual({ morning: 45, noon: 37, evening: 50 });
});

test('warning controls reject invalid values and stop at zero and 120 minutes', async () => {
  await render(
    <ThemeProvider>
      <KerahatWarningSettings />
    </ThemeProvider>,
  );
  const input = screen.getByLabelText('Günçıxma xəbərdarlığı, dəqiqə');
  await fireEvent.changeText(input, '121');
  await fireEvent(input, 'blur');
  expect(screen.getByText('0–120 dəqiqə daxil edin.')).toBeOnTheScreen();
  expect(usePreferences.getState().kerahatWarnings.morning).toBe(45);
  await fireEvent.changeText(input, '0');
  await fireEvent(input, 'blur');
  expect(screen.getByLabelText('Günçıxma xəbərdarlığını 5 dəqiqə azalt')).toBeDisabled();
  await fireEvent.changeText(input, '120');
  await fireEvent(input, 'blur');
  expect(screen.getByLabelText('Günçıxma xəbərdarlığını 5 dəqiqə artır')).toBeDisabled();
});

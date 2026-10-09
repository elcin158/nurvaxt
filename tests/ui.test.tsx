import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme';
import { usePreferences, defaultPreferences } from '../src/store/preferences';
import { PrayerList } from '../src/features/prayer-times/PrayerList';
import Calendar from '../app/(tabs)/calendar';
import { datasetSchema } from '../src/types/data';
import dataset from '../data/verified/2026.json';
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/hooks/useToday', () => ({ useToday: () => '2026-10-08' }));
jest.mock('../src/hooks/usePrayerDays', () => ({
  usePrayerDays: (start: string, end: string) => {
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
  usePreferences.setState(defaultPreferences);
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

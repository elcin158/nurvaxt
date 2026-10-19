import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Reminders from '../app/reminders';
import { defaultPreferences, restorePreferences, usePreferences } from '../src/store/preferences';
import { ThemeProvider } from '../src/theme';
import { planNotifications } from '../src/features/notifications/domain';
import { datasetSchema } from '../src/types/data';
import dataset from '../data/verified/2026.json';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/features/settings/ReminderSoundSettings', () => ({
  ReminderSoundSettings: () => null,
}));

beforeEach(async () => {
  usePreferences.setState(defaultPreferences);
  await AsyncStorage.clear();
});

const showReminders = () =>
  render(
    <ThemeProvider>
      <Reminders />
    </ThemeProvider>,
  );

test('reminders screen saves one shared kerahat selection and restores alerts for all periods', async () => {
  usePreferences.getState().set({ reminders: { ...defaultPreferences.reminders, enabled: true } });
  const view = await showReminders();
  expect(screen.getByText('Kərahətdən əvvəl')).toBeOnTheScreen();
  expect(screen.queryByText('Günçıxma kərahəti')).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Kərahətdən 5 dəqiqə əvvəl'));
  await fireEvent.press(screen.getByLabelText('Kərahətdən 15 dəqiqə əvvəl'));
  expect(screen.getByLabelText('Kərahətdən 5 dəqiqə əvvəl')).toBeChecked();
  expect(screen.getByLabelText('Kərahətdən 15 dəqiqə əvvəl')).toBeChecked();
  expect(usePreferences.getState().reminders.offsets).toEqual(defaultPreferences.reminders.offsets);
  let saved: { state: unknown } = { state: null };
  await waitFor(async () => {
    saved = JSON.parse((await AsyncStorage.getItem('nurvaxt-preferences'))!);
    expect(restorePreferences(saved.state).reminders.kerahatOffsets).toEqual([5, 15]);
  });
  await view.unmount();
  await act(async () => {
    usePreferences.setState(defaultPreferences);
    await AsyncStorage.setItem('nurvaxt-preferences', JSON.stringify(saved));
    await usePreferences.persist.rehydrate();
  });
  await showReminders();
  expect(screen.getByLabelText('Kərahətdən 5 dəqiqə əvvəl')).toBeChecked();
  expect(screen.getByLabelText('Kərahətdən 15 dəqiqə əvvəl')).toBeChecked();
  const restored = usePreferences.getState();
  const day = datasetSchema
    .parse(dataset)
    .records.find((record) => record.locationId === 'qmi-1' && record.date === '2026-10-08')!;
  expect(
    planNotifications(
      [day],
      restored.locationId,
      restored.reminders,
      Date.parse('2026-10-07T20:00:00Z'),
      60,
      restored.kerahatDurations,
    ).filter((event) => event.prayer.startsWith('kerahat-')),
  ).toHaveLength(6);
  await fireEvent.press(screen.getByLabelText('Kərahətdən 5 dəqiqə əvvəl'));
  expect(usePreferences.getState().reminders.kerahatOffsets).toEqual([15]);
  await fireEvent.press(screen.getByLabelText('Kərahətdən 15 dəqiqə əvvəl'));
  expect(screen.getByText('Kərahət xatırlatması söndürülüb.')).toBeOnTheScreen();
});

test('kerahat choices preserve global disable', async () => {
  await showReminders();
  expect(screen.getByText('İşləməsi üçün Ayarlarda bildirişləri aktivləşdirin.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Kərahətdən 10 dəqiqə əvvəl'));
  expect(usePreferences.getState().reminders.enabled).toBe(false);
  expect(usePreferences.getState().reminders.kerahatOffsets).toEqual([10]);
});

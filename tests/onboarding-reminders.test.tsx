import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Onboarding from '../app/onboarding';
import { DAILY_PRAYERS } from '../src/constants/prayers';
import { planNotifications } from '../src/features/notifications/domain';
import { requestNotificationPermission } from '../src/features/notifications/service';
import { defaultPreferences, restorePreferences, usePreferences } from '../src/store/preferences';
import { ThemeProvider } from '../src/theme';
import { datasetSchema } from '../src/types/data';
import { atTime } from '../src/utils/time';
import dataset from '../data/verified/2026.json';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/features/notifications/service', () => ({
  promptExactAccess: jest.fn(async () => {}),
  requestNotificationPermission: jest.fn(async () => true),
}));

beforeEach(() => {
  jest.clearAllMocks();
  usePreferences.setState(defaultPreferences);
});

async function showReminderStep() {
  await render(
    <ThemeProvider>
      <Onboarding />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByText('Davam et'));
  await fireEvent.press(screen.getByText('Davam et'));
}

test('onboarding selects all three reminders, saves them and plans distinct alerts for each prayer', async () => {
  await showReminderStep();
  expect(screen.getByLabelText('10 dəqiqə')).toBeChecked();
  await fireEvent.press(screen.getByLabelText('5 dəqiqə'));
  await fireEvent.press(screen.getByLabelText('15 dəqiqə'));
  for (const minutes of [5, 10, 15]) {
    expect(screen.getByLabelText(`${minutes} dəqiqə`)).toBeChecked();
  }
  await act(async () => {
    await fireEvent.press(screen.getByText('Bildirişləri aktivləşdir'));
  });
  expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(usePreferences.getState().reminders.enabled).toBe(true));

  let restored = defaultPreferences;
  await waitFor(async () => {
    const saved = JSON.parse((await AsyncStorage.getItem('nurvaxt-preferences'))!);
    restored = restorePreferences(saved.state);
    expect(restored.reminders.enabled).toBe(true);
    for (const prayer of DAILY_PRAYERS) {
      expect(restored.reminders.offsets[prayer]).toEqual([5, 10, 15]);
    }
  });

  const day = datasetSchema
    .parse(dataset)
    .records.find((record) => record.locationId === 'qmi-1' && record.date === '2026-10-08')!;
  const events = planNotifications(
    [day],
    'qmi-1',
    restored.reminders,
    Date.parse('2026-10-07T20:00:00Z'),
  );
  expect(events).toHaveLength(20);
  expect(new Set(events.map((event) => event.id)).size).toBe(20);
  for (const prayer of DAILY_PRAYERS) {
    const reminders = events.filter((event) => event.prayer === prayer);
    expect(reminders.map((event) => event.offset)).toEqual([15, 10, 5, 0]);
    for (const event of reminders) {
      expect(event.timestamp).toBe(atTime(day.date, day[prayer]!) - event.offset * 60_000);
    }
  }
});

test('each onboarding reminder can be removed without clearing İmsak, other offsets or at-time alerts', async () => {
  usePreferences.setState({
    reminders: {
      ...defaultPreferences.reminders,
      sound: 'silent',
      offsets: {
        imsak: [15],
        fajr: [10, 30],
        dhuhr: [10, 30],
        asr: [10, 30],
        maghrib: [10, 30],
        isha: [10, 30],
      },
    },
  });
  await showReminderStep();
  await fireEvent.press(screen.getByLabelText('5 dəqiqə'));
  await fireEvent.press(screen.getByLabelText('15 dəqiqə'));
  await fireEvent.press(screen.getByLabelText('10 dəqiqə'));
  expect(screen.getByLabelText('10 dəqiqə')).not.toBeChecked();
  expect(screen.getByLabelText('5 dəqiqə')).toBeChecked();
  expect(screen.getByLabelText('15 dəqiqə')).toBeChecked();
  await fireEvent.press(screen.getByLabelText('5 dəqiqə'));
  await fireEvent.press(screen.getByLabelText('15 dəqiqə'));
  for (const minutes of [5, 10, 15]) {
    expect(screen.getByLabelText(`${minutes} dəqiqə`)).not.toBeChecked();
  }
  const reminders = usePreferences.getState().reminders;
  expect(reminders.offsets.imsak).toEqual([15]);
  for (const prayer of DAILY_PRAYERS) {
    expect(reminders.offsets[prayer]).toEqual([30]);
  }
  expect(reminders.atPrayerTime).toBe(true);
  expect(reminders.sound).toBe('silent');
});

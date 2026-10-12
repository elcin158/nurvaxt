import { restorePreferences, defaultPreferences, usePreferences } from '../src/store/preferences';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchLocations } from '../src/features/locations/locations';
test('corrupt stored settings restore safe defaults', () => {
  expect(restorePreferences({ locationId: 'fake', reminders: { offsets: [-100] } })).toEqual(
    defaultPreferences,
  );
});
test('existing installations gain at-time alerts and countdown without losing saved choices', () => {
  const {
    atPrayerTime: _atTime,
    ongoingCountdown: _countdown,
    ...legacyReminders
  } = defaultPreferences.reminders;
  const legacy = {
    ...defaultPreferences,
    locationId: 'qmi-20',
    reminders: {
      ...legacyReminders,
      enabled: true,
      offsets: { ...legacyReminders.offsets, fajr: [15] },
    },
  };
  const restored = restorePreferences(legacy);
  expect(restored.locationId).toBe('qmi-20');
  expect(restored.reminders.enabled).toBe(true);
  expect(restored.reminders.offsets.fajr).toEqual([15]);
  expect(restored.reminders.atPrayerTime).toBe(true);
  expect(restored.reminders.ongoingCountdown).toBe(true);
});
test('city search supports Azerbaijani case and plain-character searches', () => {
  expect(searchLocations('BAKI').some((l) => l.name === 'Bakı')).toBe(true);
  expect(searchLocations('SƏKİ').some((l) => l.name === 'Şəki')).toBe(true);
  expect(searchLocations('gence').some((l) => l.name === 'Gəncə')).toBe(true);
});
test('older preferences preserve their choices and keep the new kerahat feature opt-in', () => {
  const { showKerahat: _kerahat, kerahatWarnings: _warnings, ...legacy } = defaultPreferences;
  expect(restorePreferences({ ...legacy, locationId: 'qmi-20', theme: 'dark' })).toMatchObject({
    locationId: 'qmi-20',
    theme: 'dark',
    showKerahat: false,
    kerahatWarnings: { morning: 45, noon: 45, evening: 45 },
  });
});
test('partial warning preferences receive defaults for the other periods', () => {
  expect(
    restorePreferences({ ...defaultPreferences, kerahatWarnings: { noon: 20 } }).kerahatWarnings,
  ).toEqual({
    morning: 45,
    noon: 20,
    evening: 45,
  });
});
test('integration: city and multi-reminder preferences survive rehydration', async () => {
  await usePreferences.persist.rehydrate();
  usePreferences.getState().setLocation('qmi-20');
  usePreferences
    .getState()
    .set({ showKerahat: true, kerahatWarnings: { morning: 0, noon: 30, evening: 90 } });
  usePreferences.getState().toggleOffset('fajr', 5);
  await new Promise((done) => setTimeout(done, 0));
  const saved = JSON.parse((await AsyncStorage.getItem('nurvaxt-preferences'))!);
  expect(saved.state.locationId).toBe('qmi-20');
  expect(saved.state.showKerahat).toBe(true);
  expect(saved.state.kerahatWarnings).toEqual({ morning: 0, noon: 30, evening: 90 });
  expect(saved.state.reminders.offsets.fajr).toContain(5);
  usePreferences.setState({
    locationId: 'qmi-1',
    showKerahat: false,
    kerahatWarnings: defaultPreferences.kerahatWarnings,
  });
  await AsyncStorage.setItem('nurvaxt-preferences', JSON.stringify(saved));
  await usePreferences.persist.rehydrate();
  expect(usePreferences.getState().locationId).toBe('qmi-20');
  expect(usePreferences.getState().showKerahat).toBe(true);
  expect(usePreferences.getState().kerahatWarnings).toEqual({ morning: 0, noon: 30, evening: 90 });
  expect(usePreferences.getState().reminders.offsets.fajr).toContain(5);
});

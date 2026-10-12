import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import Alarm, { type LiveNotificationAccess } from '../modules/nurvaxt-alarm/src';
import { ThemeProvider } from '../src/theme';
import { defaultPreferences, usePreferences } from '../src/store/preferences';
import { LiveNotificationEntry } from '../src/features/settings/LiveNotificationEntry';
import LiveNotifications from '../app/live-notifications';
import Onboarding from '../app/onboarding';
import {
  promptExactAccess,
  requestNotificationPermission,
  requestReconciliation,
} from '../src/features/notifications/service';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../modules/nurvaxt-alarm/src', () => ({
  __esModule: true,
  default: { liveNotificationAccess: jest.fn(), openLiveNotificationSettings: jest.fn() },
}));
jest.mock('../src/features/notifications/service', () => ({
  promptExactAccess: jest.fn(async () => {}),
  requestNotificationPermission: jest.fn(async () => true),
  requestReconciliation: jest.fn(async () => {}),
}));

const standard: LiveNotificationAccess = {
  mode: 'standard',
  enabled: false,
  canOpenSettings: true,
  promoted: false,
  notificationsAllowed: true,
};
let active: (state: 'active') => void;
beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  usePreferences.setState({
    ...defaultPreferences,
    reminders: { ...defaultPreferences.reminders, enabled: true },
  });
  jest.mocked(Alarm!.liveNotificationAccess).mockReturnValue(standard);
  jest.mocked(Alarm!.openLiveNotificationSettings).mockReturnValue(true);
  jest.mocked(requestNotificationPermission).mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    active = listener;
    return { remove: jest.fn() };
  });
});
afterEach(() => jest.restoreAllMocks());

test('unsupported devices have no onboarding invitation or empty card', async () => {
  jest
    .mocked(Alarm!.liveNotificationAccess)
    .mockReturnValue({ ...standard, mode: 'unsupported', canOpenSettings: false });
  const { toJSON } = await render(
    <ThemeProvider>
      <LiveNotificationEntry onboarding />
    </ThemeProvider>,
  );
  expect(toJSON()).toBeNull();
  expect(Alarm!.openLiveNotificationSettings).not.toHaveBeenCalled();
});

test('onboarding invitation navigates to the guide without changing system settings', async () => {
  await render(
    <ThemeProvider>
      <LiveNotificationEntry onboarding />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByText('Canlı göstəricini quraşdır'));
  expect(router.push).toHaveBeenCalledWith('/live-notifications');
  expect(Alarm!.openLiveNotificationSettings).not.toHaveBeenCalled();
});

test('release guide uses only app-specific live settings and explains the imminent window', async () => {
  await render(
    <ThemeProvider>
      <LiveNotifications />
    </ThemeProvider>,
  );
  expect(screen.getByText(/Canlı nişan son 30 dəqiqədə/)).toBeOnTheScreen();
  expect(screen.queryByText(/Developer options|Build number|7 dəfə/)).not.toBeOnTheScreen();
  expect(Alarm!.openLiveNotificationSettings).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Canlı bildiriş ayarını aç'));
  expect(Alarm!.openLiveNotificationSettings).toHaveBeenCalledTimes(1);
  expect(requestNotificationPermission).not.toHaveBeenCalled();
});

test('returning from Android Settings reads the actual enabled state', async () => {
  await render(
    <ThemeProvider>
      <LiveNotifications />
    </ThemeProvider>,
  );
  expect(screen.getByText('Sistem ayarını aktivləşdirin')).toBeOnTheScreen();
  jest.mocked(Alarm!.liveNotificationAccess).mockReturnValue({ ...standard, enabled: true });
  await act(async () => active('active'));
  expect(screen.getByText('Sistem ayarı aktivdir')).toBeOnTheScreen();
});

test('permission alone does not claim actual promotion; the system flag does', async () => {
  jest.mocked(Alarm!.liveNotificationAccess).mockReturnValue({ ...standard, enabled: true });
  await render(
    <ThemeProvider>
      <LiveNotifications />
    </ThemeProvider>,
  );
  expect(screen.getByText('Sistem ayarı aktivdir')).toBeOnTheScreen();
  expect(screen.queryByText('Canlı bildiriş görünür')).not.toBeOnTheScreen();
  jest
    .mocked(Alarm!.liveNotificationAccess)
    .mockReturnValue({ ...standard, enabled: true, promoted: true });
  await act(async () => active('active'));
  expect(screen.getByText('Canlı bildiriş görünür')).toBeOnTheScreen();
});

test('denied notification permission does not enable the countdown or open special settings', async () => {
  usePreferences.setState(defaultPreferences);
  jest
    .mocked(Alarm!.liveNotificationAccess)
    .mockReturnValue({ ...standard, notificationsAllowed: false });
  jest.mocked(requestNotificationPermission).mockResolvedValue(false);
  await render(
    <ThemeProvider>
      <LiveNotifications />
    </ThemeProvider>,
  );
  await act(async () => {
    await fireEvent.press(screen.getByText('Bildirişləri və göstəricini aç'));
  });
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  expect(usePreferences.getState().reminders.enabled).toBe(false);
  expect(promptExactAccess).not.toHaveBeenCalled();
  expect(Alarm!.openLiveNotificationSettings).not.toHaveBeenCalled();
});

test('enabling prerequisites keeps reminder choices and refreshes the native countdown', async () => {
  usePreferences.setState({
    reminders: {
      ...defaultPreferences.reminders,
      enabled: false,
      ongoingCountdown: false,
      sound: 'silent',
    },
  });
  await render(
    <ThemeProvider>
      <LiveNotifications />
    </ThemeProvider>,
  );
  await act(async () => {
    await fireEvent.press(screen.getByText('Bildirişləri və göstəricini aç'));
  });
  await waitFor(() => expect(requestReconciliation).toHaveBeenCalled());
  expect(usePreferences.getState().reminders).toMatchObject({
    enabled: true,
    ongoingCountdown: true,
    sound: 'silent',
  });
  expect(usePreferences.getState().reminders.offsets).toEqual(defaultPreferences.reminders.offsets);
  expect(requestReconciliation).toHaveBeenCalled();
});

test('failed settings launch stays on the guide with manual instructions', async () => {
  jest.mocked(Alarm!.openLiveNotificationSettings).mockReturnValue(false);
  await render(
    <ThemeProvider>
      <LiveNotifications />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByText('Canlı bildiriş ayarını aç'));
  expect(screen.getByText(/Ayar səhifəsi açıla bilmədi/)).toBeOnTheScreen();
});

test('fresh-install onboarding offers live setup after permission and can finish without enabling it', async () => {
  usePreferences.setState(defaultPreferences);
  await render(
    <ThemeProvider>
      <Onboarding />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByText('Davam et'));
  await fireEvent.press(screen.getByText('Davam et'));
  await act(async () => {
    await fireEvent.press(screen.getByText('Bildirişləri aktivləşdir'));
  });
  expect(await screen.findByText('Canlı göstəricini quraşdır')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Başlayaq'));
  expect(usePreferences.getState().onboardingComplete).toBe(true);
  expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  expect(Alarm!.openLiveNotificationSettings).not.toHaveBeenCalled();
});

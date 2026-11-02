import { act, render, screen } from '@testing-library/react-native';
import {
  Appearance,
  AppState,
  DeviceEventEmitter,
  Platform,
  Text,
  type AppStateStatus,
} from 'react-native';
import { defaultPreferences, usePreferences } from '../src/store/preferences';
import { ThemeProvider, useTheme } from '../src/theme';

// Exercise React Native's real Appearance cache and subscription hook.
jest.unmock('react-native/Libraries/Utilities/useColorScheme');
jest.mock('react-native/Libraries/Utilities/NativeAppearance', () => ({
  __esModule: true,
  default: {
    getColorScheme: jest.fn(() => 'light'),
    setColorScheme: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));
const nativeAppearance = require('react-native/Libraries/Utilities/NativeAppearance').default as {
  getColorScheme: jest.Mock;
};
const originalOS = Platform.OS;

function ThemeProbe() {
  const { colors, dark } = useTheme();
  return (
    <Text testID="theme" style={{ backgroundColor: colors.background }}>
      {dark ? 'dark' : 'light'}
    </Text>
  );
}
const showTheme = () =>
  render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );
const emitAppEvent = (event: 'change' | 'focus', state: AppStateStatus = 'active') => {
  for (const [name, callback] of jest.mocked(AppState.addEventListener).mock.calls) {
    if (name === event) callback(state);
  }
};

beforeEach(() => {
  Platform.OS = 'android';
  usePreferences.setState(defaultPreferences);
  jest.mocked(AppState.addEventListener).mockClear();
  jest.mocked(AppState.addEventListener).mockImplementation(() => ({ remove: jest.fn() }));
  nativeAppearance.getColorScheme.mockReturnValue('light');
  Appearance.setColorScheme('unspecified');
});
afterEach(() => {
  Platform.OS = originalOS;
  jest.restoreAllMocks();
});

test('system theme follows live appearance changes in both directions', async () => {
  await showTheme();
  for (const colorScheme of ['dark', 'light', 'dark', 'light']) {
    nativeAppearance.getColorScheme.mockReturnValue(colorScheme);
    await act(async () => DeviceEventEmitter.emit('appearanceChanged', { colorScheme }));
    expect(screen.getByTestId('theme')).toHaveTextContent(colorScheme);
  }
});

test.each(['change', 'focus'] as const)(
  'system theme recovers missed appearance events on Android %s',
  async (event) => {
    nativeAppearance.getColorScheme.mockReturnValue('dark');
    Appearance.setColorScheme('unspecified');
    await showTheme();
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    for (const colorScheme of ['light', 'dark', 'light']) {
      // The OS changes while settings/the notification shade is open, without a JS event.
      nativeAppearance.getColorScheme.mockReturnValue(colorScheme);
      expect(Appearance.getColorScheme()).not.toBe(colorScheme);
      await act(async () => emitAppEvent(event));
      expect(screen.getByTestId('theme')).toHaveTextContent(colorScheme);
      expect(screen.getByTestId('theme')).toHaveStyle({
        backgroundColor: colorScheme === 'dark' ? '#0B1120' : '#F8FAFC',
      });
    }
    expect(usePreferences.getState().theme).toBe('system');
  },
);

test.each(['light', 'dark'] as const)(
  'manual %s stays selected through system changes and follows the OS when system is selected',
  async (theme) => {
    usePreferences.setState({ theme });
    await showTheme();
    const colorScheme = theme === 'dark' ? 'light' : 'dark';
    nativeAppearance.getColorScheme.mockReturnValue(colorScheme);
    await act(async () => {
      DeviceEventEmitter.emit('appearanceChanged', { colorScheme });
      emitAppEvent('change');
      emitAppEvent('focus');
    });
    expect(screen.getByTestId('theme')).toHaveTextContent(theme);

    // Miss another event before switching back to system mode.
    nativeAppearance.getColorScheme.mockReturnValue(theme);
    await act(async () => usePreferences.setState({ theme: 'system' }));
    expect(screen.getByTestId('theme')).toHaveTextContent(theme);
    await act(async () => DeviceEventEmitter.emit('appearanceChanged', { colorScheme }));
    expect(screen.getByTestId('theme')).toHaveTextContent(colorScheme);
  },
);

test('unmount removes appearance, resume and focus subscriptions', async () => {
  const appearanceSubscription = jest.spyOn(Appearance, 'addChangeListener');
  const view = await showTheme();
  const removeAppearance = jest.spyOn(appearanceSubscription.mock.results.at(-1)!.value, 'remove');
  const subscriptions = jest
    .mocked(AppState.addEventListener)
    .mock.results.map(({ value }) => value);
  expect(subscriptions).toHaveLength(2);
  await view.unmount();
  expect(removeAppearance).toHaveBeenCalledTimes(1);
  for (const subscription of subscriptions) expect(subscription.remove).toHaveBeenCalledTimes(1);
});

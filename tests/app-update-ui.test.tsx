import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { ThemeProvider } from '../src/theme';
import { UpdateBanner } from '../src/features/app-updates/UpdateBanner';
import { UpdateSettings } from '../src/features/app-updates/UpdateSettings';
import { appUpdates, useAppUpdates } from '../src/features/app-updates/service';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../src/features/app-updates/service', () => {
  const { create } = require('zustand');
  return {
    useAppUpdates: create(() => ({})),
    appUpdates: {
      supported: true,
      check: jest.fn(async () => 'available'),
      start: jest.fn(),
      install: jest.fn(),
      dismiss: jest.fn(),
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  useAppUpdates.setState({
    status: 'available',
    visible: true,
    busy: false,
    checking: false,
    error: null,
    versionCode: 9,
    bytesDownloaded: 0,
    totalBytes: 0,
  });
  jest.mocked(appUpdates.check).mockResolvedValue('available');
});
afterEach(() => jest.restoreAllMocks());
const showBanner = () =>
  render(
    <ThemeProvider>
      <UpdateBanner />
    </ThemeProvider>,
  );

test('no card occupies space when there is no visible offer', async () => {
  useAppUpdates.setState({ visible: false });
  const view = await showBanner();
  expect(view.toJSON()).toBeNull();
});

test('the compact offer gives explicit update and defer actions', async () => {
  await showBanner();
  expect(screen.getByText('Yeni versiya mövcuddur')).toBeOnTheScreen();
  expect(appUpdates.start).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Yenilə' }));
  expect(appUpdates.start).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Sonra' }));
  expect(appUpdates.dismiss).toHaveBeenCalledTimes(1);
});

test('a downloaded update only installs after pressing Restart', async () => {
  useAppUpdates.setState({ status: 'downloaded' });
  await showBanner();
  expect(screen.getByText('Yeniləmə hazırdır')).toBeOnTheScreen();
  expect(appUpdates.install).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Yenidən başlat' }));
  expect(appUpdates.install).toHaveBeenCalledTimes(1);
});

test('download progress is accessible and hides update actions', async () => {
  useAppUpdates.setState({ status: 'downloading', bytesDownloaded: 40, totalBytes: 100 });
  await showBanner();
  expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', {
    min: 0,
    max: 100,
    now: 40,
  });
  expect(screen.getByText('40%')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Yenilə' })).not.toBeOnTheScreen();
  expect(screen.getByText('Tətbiqdən istifadə etməyə davam edə bilərsiniz.')).toBeOnTheScreen();
});

test('the pending state does not claim a made-up percentage', async () => {
  useAppUpdates.setState({ status: 'pending' });
  await showBanner();
  expect(screen.getByText('Google Play vasitəsilə')).toBeOnTheScreen();
  expect(screen.queryByText('0%')).not.toBeOnTheScreen();
});

test('a busy consent action cannot open the Play dialog twice', async () => {
  useAppUpdates.setState({ busy: true });
  await showBanner();
  const button = screen.getByRole('button', { name: 'Yenilə' });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(appUpdates.start).not.toHaveBeenCalled();
});

test('Settings checks manually and reports current availability truthfully', async () => {
  useAppUpdates.setState({ visible: false });
  jest.mocked(appUpdates.check).mockResolvedValue('current');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(
    <ThemeProvider>
      <UpdateSettings />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: /Yeniləməni yoxla/ }));
  expect(appUpdates.check).toHaveBeenCalledWith(true);
  expect(alert).toHaveBeenCalledWith(
    'Yeniləmə yoxdur',
    expect.stringContaining('sizin üçün əlçatan'),
  );
});

test('manual connection failures offer a Play Store fallback', async () => {
  useAppUpdates.setState({ visible: false });
  jest.mocked(appUpdates.check).mockResolvedValue('error');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(
    <ThemeProvider>
      <UpdateSettings />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: /Yeniləməni yoxla/ }));
  expect(alert).toHaveBeenCalledWith(
    'Yoxlama mümkün olmadı',
    expect.any(String),
    expect.arrayContaining([
      expect.objectContaining({ text: 'Play Store-u aç', onPress: expect.any(Function) }),
    ]),
  );
});

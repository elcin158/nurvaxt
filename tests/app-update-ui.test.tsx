import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Alert, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { ThemeProvider } from '../src/theme';
import { UpdatePanel } from '../src/features/app-updates/UpdatePanel';
import { UpdateBadge } from '../src/features/app-updates/UpdateBadge';
import { UpdateSettings } from '../src/features/app-updates/UpdateSettings';
import { appUpdates, useAppUpdates } from '../src/features/app-updates/service';
import { findRelease } from '../src/features/app-updates/releases';
import WhatsNew from '../app/whats-new';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/features/app-updates/version', () => ({ installedVersionCode: 16 }));
jest.mock('../src/features/app-updates/service', () => {
  const { create } = require('zustand');
  return {
    downloadProgress: jest.requireActual('../src/features/app-updates/service').downloadProgress,
    useAppUpdates: create(() => ({})),
    appUpdates: {
      supported: true,
      check: jest.fn(async () => 'available'),
      start: jest.fn(),
      install: jest.fn(),
      dismiss: jest.fn(async () => {}),
      open: jest.fn(),
      readWhatsNew: jest.fn(),
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  useAppUpdates.setState({
    status: 'available',
    panel: 'update',
    announcement: null,
    release: null,
    notesLoading: false,
    busy: false,
    checking: false,
    error: null,
    versionCode: 99,
    bytesDownloaded: 0,
    totalBytes: 0,
  });
  jest.mocked(appUpdates.check).mockResolvedValue('available');
});
afterEach(() => jest.restoreAllMocks());
const show = () =>
  render(
    <ThemeProvider>
      <UpdatePanel />
      <UpdateBadge />
    </ThemeProvider>,
  );

test('Later leaves a persistent badge that reopens the panel without checking or downloading', async () => {
  useAppUpdates.setState({ panel: null });
  await show();
  expect(screen.queryByText('Yeni versiya mövcuddur')).not.toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Yeni versiya mövcuddur, yeniləmə panelini aç' }),
  );
  expect(appUpdates.open).toHaveBeenCalledTimes(1);
  expect(appUpdates.check).not.toHaveBeenCalled();
  expect(appUpdates.start).not.toHaveBeenCalled();
});

test('an installed or unavailable update leaves no update badge or empty panel', async () => {
  useAppUpdates.setState({ status: 'idle', panel: null });
  const view = await show();
  expect(view.toJSON()).toBeNull();
});

test('the panel gives explicit update and defer actions', async () => {
  await show();
  expect(screen.getByText('Yeni versiya mövcuddur')).toBeOnTheScreen();
  expect(appUpdates.start).not.toHaveBeenCalled();
  await fireEvent.press(
    within(screen.getByTestId('update-panel')).getByRole('button', { name: 'Yenilə' }),
  );
  expect(appUpdates.start).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Sonra' }));
  expect(appUpdates.dismiss).toHaveBeenCalledTimes(1);
});

test('the panel uses notes for the exact offered version only', async () => {
  useAppUpdates.setState({ versionCode: 14 });
  await show();
  expect(screen.getByText('Daha aydın canlı bildiriş')).toBeOnTheScreen();
  expect(screen.getByText('1.0.11')).toBeOnTheScreen();
  expect(screen.queryByText('Daha sadə canlı bildiriş')).not.toBeOnTheScreen();
});

test('unknown future versions offer the store details instead of invented release notes', async () => {
  const link = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await show();
  expect(
    screen.getByText('Bu versiyanın dəyişiklik məlumatı hazırda əlçatan deyil.'),
  ).toBeOnTheScreen();
  expect(screen.queryByText('1.0.14')).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Play Store-da bax' }));
  expect(link).toHaveBeenCalledWith('https://play.google.com/store/apps/details?id=az.nurvaxt.app');
});

test('GitHub notes show the exact future version and its changes before installation', async () => {
  useAppUpdates.setState({
    release: {
      versionCode: 99,
      version: '2.0.0',
      date: '2026-11-03',
      important: true,
      items: [{ icon: 'sparkles-outline', title: 'Yeni imkan', description: 'İmkanın izahı.' }],
    },
  });
  await show();
  expect(screen.getByText('2.0.0')).toBeOnTheScreen();
  expect(screen.getByText('Yeni imkan')).toBeOnTheScreen();
  expect(screen.getByText('İmkanın izahı.')).toBeOnTheScreen();
  expect(screen.queryByText('Play Store-da bax')).not.toBeOnTheScreen();
});

test('waiting for notes keeps update actions usable and does not claim notes are missing', async () => {
  useAppUpdates.setState({ notesLoading: true });
  await show();
  expect(screen.getByText('Yeniliklər yüklənir…')).toBeOnTheScreen();
  expect(screen.queryByText('Play Store-da bax')).not.toBeOnTheScreen();
  await fireEvent.press(
    within(screen.getByTestId('update-panel')).getByRole('button', { name: 'Yenilə' }),
  );
  expect(appUpdates.start).toHaveBeenCalledTimes(1);
});

test('notes belonging to another future build cannot appear in the update panel', async () => {
  useAppUpdates.setState({ release: { ...findRelease(14)!, versionCode: 98, version: '9.9.9' } });
  await show();
  expect(screen.queryByText('9.9.9')).not.toBeOnTheScreen();
  expect(screen.queryByText('Daha aydın canlı bildiriş')).not.toBeOnTheScreen();
  expect(screen.getByText('Play Store-da bax')).toBeOnTheScreen();
});

test('a downloaded update only installs after pressing Restart', async () => {
  useAppUpdates.setState({ status: 'downloaded' });
  await show();
  expect(screen.getByText('Yeniləmə hazırdır')).toBeOnTheScreen();
  expect(appUpdates.install).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Yenidən başlat' }));
  expect(appUpdates.install).toHaveBeenCalledTimes(1);
});

test('download progress is accessible and can be put in the background', async () => {
  useAppUpdates.setState({ status: 'downloading', bytesDownloaded: 40, totalBytes: 100 });
  await show();
  expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', {
    min: 0,
    max: 100,
    now: 40,
  });
  expect(screen.getAllByText('40%')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Yenilə' })).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Arxa planda davam et' }));
  expect(appUpdates.dismiss).toHaveBeenCalledTimes(1);
});

test('pending downloads do not claim a made-up percentage', async () => {
  useAppUpdates.setState({ status: 'pending' });
  await show();
  expect(screen.getByText('Google Play vasitəsilə')).toBeOnTheScreen();
  expect(screen.queryByText('0%')).not.toBeOnTheScreen();
});

test('a busy consent action cannot open the Play dialog twice', async () => {
  useAppUpdates.setState({ busy: true });
  await show();
  const button = within(screen.getByTestId('update-panel')).getByRole('button', { name: 'Yenilə' });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(appUpdates.start).not.toHaveBeenCalled();
});

test('post-install announcements use Oldu and do not offer another update', async () => {
  useAppUpdates.setState({ status: 'idle', panel: 'whats-new', announcement: findRelease(14)! });
  await show();
  expect(screen.getByText('NurVaxt-da yeniliklər')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Yenilə' })).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Oldu' }));
  expect(appUpdates.dismiss).toHaveBeenCalledTimes(1);
});

test('Settings reopens an available update instead of rechecking it', async () => {
  useAppUpdates.setState({ panel: null });
  await render(
    <ThemeProvider>
      <UpdateSettings />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: /Yeniləmə mövcuddur/ }));
  expect(appUpdates.open).toHaveBeenCalledTimes(1);
  expect(appUpdates.check).not.toHaveBeenCalled();
});

test('Settings checks manually and reports current availability truthfully', async () => {
  useAppUpdates.setState({ status: 'idle', panel: null });
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
  useAppUpdates.setState({ status: 'idle', panel: null });
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
    expect.arrayContaining([expect.objectContaining({ text: 'Play Store-u aç' })]),
  );
});

test('web keeps the release history without unsupported Play controls', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  useAppUpdates.setState({ status: 'idle', panel: null });
  await render(
    <ThemeProvider>
      <UpdateSettings />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: /Yeniliklər/ }));
  expect(router.push).toHaveBeenCalledWith('/whats-new');
  expect(screen.queryByText('Yeniləməni yoxla')).not.toBeOnTheScreen();
});

test('whats-new shows only the installed release notes and marks the announcement read', async () => {
  await render(
    <ThemeProvider>
      <WhatsNew />
    </ThemeProvider>,
  );
  expect(screen.getByText('1.0.13')).toBeOnTheScreen();
  expect(screen.getByText('Daha sadə canlı bildiriş')).toBeOnTheScreen();
  expect(screen.queryByText('1.0.14')).not.toBeOnTheScreen();
  expect(screen.queryByText('1.0.12')).not.toBeOnTheScreen();
  expect(appUpdates.readWhatsNew).toHaveBeenCalledTimes(1);
});

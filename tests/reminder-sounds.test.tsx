import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import { ThemeProvider } from '../src/theme';
import { defaultPreferences, restorePreferences, usePreferences } from '../src/store/preferences';
import { ReminderSoundSettings } from '../src/features/settings/ReminderSoundSettings';
import { REMINDER_SOUNDS, notificationSound } from '../src/features/notifications/sounds';
import { previewSources } from '../src/features/notifications/previewSources';
import Alarm from '../modules/nurvaxt-alarm/src';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('expo-audio', () => {
  const player = { pause: jest.fn(), replace: jest.fn(), play: jest.fn() };
  return {
    testPlayer: player,
    testStatus: { didJustFinish: false },
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => require('expo-audio').testStatus,
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
  };
});
jest.mock('../modules/nurvaxt-alarm/src', () => ({
  __esModule: true,
  default: {
    previewDefaultSound: jest.fn(),
    stopSoundPreview: jest.fn(),
    isSoundPreviewPlaying: jest.fn(),
  },
}));
const player = require('expo-audio').testPlayer as {
  pause: jest.Mock;
  replace: jest.Mock;
  play: jest.Mock;
};
const originalOS = Platform.OS;
beforeEach(() => {
  Platform.OS = 'android';
  jest.clearAllMocks();
  jest.mocked(AppState.addEventListener).mockReturnValue({ remove: jest.fn() });
  jest.mocked(setAudioModeAsync).mockResolvedValue();
  jest.mocked(Alarm!.previewDefaultSound).mockReturnValue('playing');
  jest.mocked(Alarm!.isSoundPreviewPlaying).mockReturnValue(true);
  require('expo-audio').testStatus.didJustFinish = false;
  usePreferences.setState(defaultPreferences);
});
afterEach(() => {
  Platform.OS = originalOS;
  jest.useRealTimers();
});
const showSettings = () =>
  render(
    <ThemeProvider>
      <ReminderSoundSettings />
    </ThemeProvider>,
  );
const press = (label: string) =>
  act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
const hover = (label: string, event: 'hoverIn' | 'hoverOut') =>
  act(async () => {
    fireEvent(screen.getByLabelText(label), event);
  });

test('selecting a tone previews it and preserves the other reminder choices', async () => {
  usePreferences.setState({
    reminders: { ...defaultPreferences.reminders, enabled: true, vibration: false },
  });
  await showSettings();
  await press('Yumşaq ton');
  expect(usePreferences.getState().reminders).toMatchObject({
    sound: 'soft',
    enabled: true,
    vibration: false,
  });
  expect(player.replace).toHaveBeenLastCalledWith(previewSources.soft);
  expect(player.play).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Yumşaq ton')).toBeChecked();
});

test('hover and listen preview without changing the saved notification sound', async () => {
  await showSettings();
  expect(screen.getByLabelText('Melodiya')).toBeChecked();
  expect(player.play).not.toHaveBeenCalled();
  await hover('Zəng', 'hoverIn');
  expect(player.replace).toHaveBeenLastCalledWith(previewSources.bell);
  expect(usePreferences.getState().reminders.sound).toBe('melody');
  await hover('Zəng', 'hoverOut');
  expect(screen.getByLabelText('Zəng: dinlə')).toBeOnTheScreen();
  await press('Melodiya: dinlə');
  expect(player.replace).toHaveBeenLastCalledWith(previewSources.melody);
  expect(usePreferences.getState().reminders.sound).toBe('melody');
});

test('newer previews cancel pending audio setup and silent stops playback', async () => {
  let finishSetup!: () => void;
  jest.mocked(setAudioModeAsync).mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        finishSetup = done;
      }),
  );
  await showSettings();
  await press('Qısa ton');
  await press('Zəng');
  await act(async () => finishSetup());
  expect(player.replace).toHaveBeenCalledTimes(1);
  expect(player.replace).toHaveBeenLastCalledWith(previewSources.bell);
  await press('Səssiz');
  expect(usePreferences.getState().reminders.sound).toBe('silent');
  expect(screen.queryByText('Səslənir…')).not.toBeOnTheScreen();
  expect(player.pause).toHaveBeenCalled();
});

test('screen exit prevents an unfinished preview from starting', async () => {
  let finishSetup!: () => void;
  jest.mocked(setAudioModeAsync).mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        finishSetup = done;
      }),
  );
  const view = await showSettings();
  await press('Zəng: dinlə');
  await view.unmount();
  await act(async () => finishSetup());
  expect(player.play).not.toHaveBeenCalled();
});

test('backgrounding stops preview, while an audio setup failure stays recoverable', async () => {
  const subscription = jest.mocked(AppState.addEventListener);
  await showSettings();
  await press('Zəng: dinlə');
  const callback = subscription.mock.calls.find(([event]) => event === 'change')![1];
  await act(async () => callback('background'));
  expect(screen.queryByText('Səslənir…')).not.toBeOnTheScreen();
  jest.mocked(setAudioModeAsync).mockRejectedValueOnce(new Error('audio unavailable'));
  await press('Zəng: dinlə');
  expect(
    screen.getByText('Səs açıla bilmədi. Dinləmə düyməsinə yenidən toxunun.'),
  ).toBeOnTheScreen();
  await press('Zəng: dinlə');
  expect(
    screen.queryByText('Səs açıla bilmədi. Dinləmə düyməsinə yenidən toxunun.'),
  ).not.toBeOnTheScreen();
});

test('Android previews the system notification sound through the native ringtone player', async () => {
  await showSettings();
  await press('Standart: dinlə');
  expect(Alarm!.previewDefaultSound).toHaveBeenCalledTimes(1);
  expect(player.replace).not.toHaveBeenCalled();
  expect(player.play).not.toHaveBeenCalled();
  expect(setAudioModeAsync).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Standart: səsi dayandır')).toBeOnTheScreen();
  expect(usePreferences.getState().reminders.sound).toBe('melody');
  const stops = jest.mocked(Alarm!.stopSoundPreview).mock.calls.length;
  await press('Standart: səsi dayandır');
  expect(Alarm!.stopSoundPreview).toHaveBeenCalledTimes(stops + 1);
  expect(screen.queryByText('Səslənir…')).not.toBeOnTheScreen();
});

test.each([
  ['silent', 'Telefonun standart bildiriş səsi səssizdir. Səs ayarlarından bildiriş səsi seçin.'],
  ['muted', 'Telefonun bildiriş səsi bağlıdır. Səs ayarlarından bildiriş səsini artırın.'],
  ['unavailable', 'Səs açıla bilmədi. Dinləmə düyməsinə yenidən toxunun.'],
] as const)(
  'Android reports %s system playback without claiming it is playing',
  async (result, message) => {
    jest.mocked(Alarm!.previewDefaultSound).mockReturnValue(result);
    await showSettings();
    await press('Standart: dinlə');
    expect(screen.getByText(message)).toBeOnTheScreen();
    expect(screen.queryByText('Səslənir…')).not.toBeOnTheScreen();
    expect(usePreferences.getState().reminders.sound).toBe('melody');
    jest.mocked(Alarm!.previewDefaultSound).mockReturnValue('playing');
    await press('Standart: dinlə');
    expect(screen.queryByText(message)).not.toBeOnTheScreen();
    expect(screen.getByText('Səslənir…')).toBeOnTheScreen();
  },
);

test('system playback stops on a new selection, backgrounding and screen exit', async () => {
  const view = await showSettings();
  await press('Standart: dinlə');
  let stops = jest.mocked(Alarm!.stopSoundPreview).mock.calls.length;
  await press('Zəng');
  expect(Alarm!.stopSoundPreview).toHaveBeenCalledTimes(stops + 1);
  await press('Standart');
  stops = jest.mocked(Alarm!.stopSoundPreview).mock.calls.length;
  const callback = jest
    .mocked(AppState.addEventListener)
    .mock.calls.find(([event]) => event === 'change')![1];
  await act(async () => callback('background'));
  expect(Alarm!.stopSoundPreview).toHaveBeenCalledTimes(stops + 1);
  await press('Standart: dinlə');
  stops = jest.mocked(Alarm!.stopSoundPreview).mock.calls.length;
  await view.unmount();
  expect(Alarm!.stopSoundPreview).toHaveBeenCalledTimes(stops + 1);
});

test('system completion clears the playing state independently of custom audio status', async () => {
  jest.useFakeTimers();
  const view = await showSettings();
  await press('Standart: dinlə');
  require('expo-audio').testStatus.didJustFinish = true;
  await view.rerender(
    <ThemeProvider>
      <ReminderSoundSettings />
    </ThemeProvider>,
  );
  expect(screen.getByText('Səslənir…')).toBeOnTheScreen();
  jest.mocked(Alarm!.isSoundPreviewPlaying).mockReturnValue(false);
  await act(async () => jest.advanceTimersByTime(100));
  expect(screen.queryByText('Səslənir…')).not.toBeOnTheScreen();
});

test('system preview is bounded even if the ringtone keeps playing', async () => {
  jest.useFakeTimers();
  await showSettings();
  await press('Standart: dinlə');
  await act(async () => jest.advanceTimersByTime(4000));
  expect(screen.queryByText('Səslənir…')).not.toBeOnTheScreen();
  expect(Alarm!.stopSoundPreview).toHaveBeenCalled();
});

test('choosing standard cancels an unfinished custom preview', async () => {
  let finishSetup!: () => void;
  jest.mocked(setAudioModeAsync).mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        finishSetup = done;
      }),
  );
  await showSettings();
  await press('Zəng');
  await press('Standart');
  await act(async () => finishSetup());
  expect(player.play).not.toHaveBeenCalled();
  expect(Alarm!.previewDefaultSound).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Səslənir…')).toBeOnTheScreen();
});

test('iOS offers real previews for custom sounds and explains the system sound', async () => {
  Platform.OS = 'ios';
  await showSettings();
  expect(screen.queryByLabelText('Standart: dinlə')).not.toBeOnTheScreen();
  expect(screen.getByLabelText('Melodiya: dinlə')).toBeOnTheScreen();
  await press('Standart');
  expect(player.play).not.toHaveBeenCalled();
});

test.each(REMINDER_SOUNDS)(
  '$title survives preference restoration without resetting city or offsets',
  (option) => {
    const saved = {
      ...defaultPreferences,
      locationId: 'qmi-20',
      reminders: { ...defaultPreferences.reminders, sound: option.id },
    };
    expect(restorePreferences(saved)).toMatchObject(saved);
  },
);

test('every custom notification sound is bundled identically for native delivery and preview', () => {
  const project = readFileSync(
    resolve(__dirname, '../ios/NurVaxt.xcodeproj/project.pbxproj'),
    'utf8',
  );
  for (const option of REMINDER_SOUNDS.filter((sound) => sound.file)) {
    expect(notificationSound(option.id)).toBe(option.file);
    const wav = readFileSync(resolve(__dirname, '../assets', option.file!));
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    const duration = wav.readUInt32LE(40) / wav.readUInt32LE(28);
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(30);
    expect(
      readFileSync(resolve(__dirname, '../android/app/src/main/res/raw', option.file!)),
    ).toEqual(wav);
    expect(readFileSync(resolve(__dirname, '../ios/NurVaxt', option.file!))).toEqual(wav);
    expect(project).toContain(`${option.file} in Resources`);
  }
});

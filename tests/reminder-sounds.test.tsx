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

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('expo-audio', () => {
  const player = { pause: jest.fn(), replace: jest.fn(), play: jest.fn() };
  return {
    testPlayer: player,
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => ({ didJustFinish: false }),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
  };
});
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
  usePreferences.setState(defaultPreferences);
});
afterEach(() => {
  Platform.OS = originalOS;
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
  await hover('Zəng', 'hoverIn');
  expect(player.replace).toHaveBeenLastCalledWith(previewSources.bell);
  expect(usePreferences.getState().reminders.sound).toBe('default');
  await hover('Zəng', 'hoverOut');
  expect(screen.getByLabelText('Zəng: dinlə')).toBeOnTheScreen();
  await press('Melodiya: dinlə');
  expect(player.replace).toHaveBeenLastCalledWith(previewSources.melody);
  expect(usePreferences.getState().reminders.sound).toBe('default');
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

test('Android previews the actual system notification URI', async () => {
  await showSettings();
  await press('Standart: dinlə');
  expect(player.replace).toHaveBeenLastCalledWith({
    uri: 'content://settings/system/notification_sound',
  });
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

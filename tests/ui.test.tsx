import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { ThemeProvider } from '../src/theme';
import { usePreferences, defaultPreferences } from '../src/store/preferences';
import { PRAYER_FIELDS } from '../src/constants/prayers';
import { PrayerList } from '../src/features/prayer-times/PrayerList';
import { KerahatTimesCard } from '../src/features/prayer-times/KerahatTimesCard';
import { NextPrayerCard } from '../src/features/prayer-times/NextPrayerCard';
import { useActiveClock } from '../src/hooks/useActiveClock';
import { useToday } from '../src/hooks/useToday';
import { KerahatDurationSettings } from '../src/features/settings/KerahatDurationSettings';
import Home from '../app/(tabs)/index';
import { datasetSchema } from '../src/types/data';
import dataset from '../data/verified/2026.json';
const shareSpy = jest.spyOn(Share, 'share');
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const pressShare = () =>
  act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Vaxtları paylaş' }));
  });
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('../src/hooks/useToday', () => ({ useToday: jest.fn(() => '2026-10-08') }));
jest.mock('../src/hooks/useActiveClock', () => ({
  useActiveClock: jest.fn(() => Date.parse('2026-10-08T02:50:00Z')),
}));
jest.mock('../src/hooks/usePrayerDays', () => ({
  usePrayerDays: (start: string, end = start) => {
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
  jest.clearAllMocks();
  shareSpy.mockReset().mockResolvedValue({ action: Share.sharedAction });
  usePreferences.setState(defaultPreferences);
  jest.mocked(useToday).mockReturnValue('2026-10-08');
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T02:50:00Z'));
});
test('home time rows are read-only and day navigation still updates the times', async () => {
  usePreferences.setState({ showKerahat: true, visibleFields: [...PRAYER_FIELDS] });
  await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.queryByText('Günün bütün vaxtları')).not.toBeOnTheScreen();
  expect(screen.getByLabelText('Günbatımı, 18:11')).toBeOnTheScreen();
  expect(screen.getByLabelText('Məğrib, 18:25')).toBeOnTheScreen();
  const row = screen.getByLabelText('Əsr, 16:27');
  expect(row).toHaveProp('accessibilityRole', 'text');
  expect(row).not.toHaveProp('onPress');
  await fireEvent.press(row);
  expect(screen.queryByText('Xatırlatmaları tənzimlə')).not.toBeOnTheScreen();
  expect(screen.queryByLabelText('Vaxt təfərrüatını bağla')).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Növbəti gün'));
  expect(screen.getByLabelText('Günçıxma, 06:45')).toBeOnTheScreen();
  expect(screen.getByText(/06:45\s*–\s*07:30/)).toBeOnTheScreen();
});

test('home follows the next prayer day at İşa and keeps that timetable across midnight', async () => {
  usePreferences.setState({ visibleFields: [...PRAYER_FIELDS] });
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T15:24:00Z'));
  const view = await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('Bu gün · 8 oktyabr 2026')).toBeOnTheScreen();
  expect(screen.getByLabelText('İşa, 19:25, növbəti namaz')).toBeOnTheScreen();

  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T15:25:00Z'));
  await view.rerender(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('Sabah · 9 oktyabr 2026')).toBeOnTheScreen();
  expect(screen.getByLabelText('İmsak, 05:21, növbəti vaxt')).toBeOnTheScreen();
  expect(screen.getByLabelText('Günçıxma, 06:45')).toBeOnTheScreen();
  await pressShare();
  expect(shareSpy.mock.calls[0]?.[0].message).toContain('Bakı\n9 oktyabr 2026, cümə');

  jest.mocked(useToday).mockReturnValue('2026-10-09');
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T20:00:00Z'));
  await view.rerender(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('Bu gün · 9 oktyabr 2026')).toBeOnTheScreen();
  expect(screen.getByLabelText('İmsak, 05:21, növbəti vaxt')).toBeOnTheScreen();
});

test('manual day navigation stays selected until returning to the next prayer day', async () => {
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T17:00:00Z'));
  const view = await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByLabelText('Əvvəlki gün'));
  expect(screen.getByText('Bu gün · 8 oktyabr 2026')).toBeOnTheScreen();
  expect(screen.getByLabelText('Sübh, 05:25')).toBeOnTheScreen();
  expect(screen.queryByText('NÖVBƏTİ')).not.toBeOnTheScreen();

  jest.mocked(useToday).mockReturnValue('2026-10-09');
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T20:00:00Z'));
  await view.rerender(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('8 oktyabr 2026')).toBeOnTheScreen();
  expect(screen.getByLabelText('Sübh, 05:25')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: /Növbəti namazın gününə qayıt$/ }));
  expect(screen.getByText('Bu gün · 9 oktyabr 2026')).toBeOnTheScreen();
  expect(screen.getByLabelText('İmsak, 05:21, növbəti vaxt')).toBeOnTheScreen();
});

test('changing city follows its next prayer even when that changes the displayed day', async () => {
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T15:30:00Z'));
  await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('Sabah · 9 oktyabr 2026')).toBeOnTheScreen();
  expect(screen.getByLabelText('İmsak, 05:21, növbəti vaxt')).toBeOnTheScreen();
  await act(async () => usePreferences.getState().setLocation('qmi-20'));
  expect(screen.getByText('Bu gün · 8 oktyabr 2026')).toBeOnTheScreen();
  expect(screen.getByLabelText('İşa, 19:39, növbəti namaz')).toBeOnTheScreen();
});

test('sharing includes all nine times even when rows are hidden, and follows format, city and date', async () => {
  usePreferences.setState({ timeFormat: '12', visibleFields: ['fajr', 'asr', 'sunset'] });
  await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('6:11 g.s.')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Məğrib, 18:25')).not.toBeOnTheScreen();
  await pressShare();
  expect(shareSpy.mock.calls[0]?.[0].message).toContain('Sübh: 5:25 g.ə.');
  expect(shareSpy.mock.calls[0]?.[0].message).toContain('Məğrib: 6:25 g.s.');
  expect(shareSpy.mock.calls[0]?.[0].message).toContain('Gecəyarısı: 11:48 g.s.');
  await act(async () => usePreferences.getState().setLocation('qmi-20'));
  expect(screen.getByLabelText('Əsr, 16:40')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Növbəti gün'));
  await pressShare();
  const message = shareSpy.mock.calls[1]?.[0].message;
  expect(message).toContain('Gəncə\n9 oktyabr 2026, cümə');
  expect(message).not.toContain('Bakı');
  expect(message).toContain('Əsr: 4:39 g.s.');
  expect(message?.split('\n').filter((line) => /^.+: \d/.test(line))).toHaveLength(9);
});
test('one share button opens the system sheet with the full dated timetable and source', async () => {
  await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getAllByRole('button', { name: 'Vaxtları paylaş' })).toHaveLength(1);
  await pressShare();
  expect(shareSpy).toHaveBeenCalledWith(
    {
      title: 'Namaz vaxtları · Bakı · 8 oktyabr 2026, cümə axşamı',
      message: [
        'NurVaxt · Namaz vaxtları',
        'Bakı',
        '8 oktyabr 2026, cümə axşamı',
        '',
        'İmsak: 05:20',
        'Sübh: 05:25',
        'Günçıxma: 06:44',
        'Zöhr: 12:28',
        'Əsr: 16:27',
        'Günbatımı: 18:11',
        'Məğrib: 18:25',
        'İşa: 19:25',
        'Gecəyarısı: 23:48',
        '',
        'Mənbə: Qafqaz Müsəlmanları İdarəsi',
      ].join('\n'),
    },
    {
      dialogTitle: 'Vaxtları paylaş',
      subject: 'Namaz vaxtları · Bakı · 8 oktyabr 2026, cümə axşamı',
    },
  );
});
test('share failure allows retry and dismissing the sheet is silent', async () => {
  shareSpy.mockRejectedValueOnce(new Error('Unavailable'));
  await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  await pressShare();
  await waitFor(() =>
    expect(alertSpy).toHaveBeenCalledWith('Paylaşmaq mümkün olmadı', 'Yenidən cəhd edin.'),
  );
  shareSpy.mockResolvedValueOnce({ action: Share.dismissedAction });
  await pressShare();
  expect(shareSpy).toHaveBeenCalledTimes(2);
  expect(alertSpy).toHaveBeenCalledTimes(1);
});
test('sharing omits missing source times without inventing values', async () => {
  const day = { ...datasetSchema.parse(dataset).records[7]!, sunset: null };
  await render(
    <ThemeProvider>
      <PrayerList day={day} />
    </ThemeProvider>,
  );
  await pressShare();
  expect(shareSpy.mock.calls[0]?.[0].message).not.toContain('Günbatımı:');
  expect(shareSpy.mock.calls[0]?.[0].message).toContain('Məğrib: 18:25');
});
test('switching from Bakı to Gəncə replaces the times with that city’s source times', async () => {
  await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('16:27')).toBeOnTheScreen();
  await act(async () => usePreferences.getState().setLocation('qmi-20'));
  expect(screen.getByText('16:40')).toBeOnTheScreen();
  expect(screen.queryByText('16:27')).not.toBeOnTheScreen();
  await pressShare();
  expect(shareSpy.mock.calls[0]?.[0].message).toContain('Gəncə\n8 oktyabr 2026');
  expect(shareSpy.mock.calls[0]?.[0].message).toContain('Əsr: 16:40');
});
test('prayer rows use all distinct source fields and an accessible next label', async () => {
  usePreferences.setState({ visibleFields: [...PRAYER_FIELDS] });
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
test('sunrise, sunset and midnight are hidden until they are turned on', async () => {
  const day = datasetSchema.parse(dataset).records[7]!;
  const view = await render(
    <ThemeProvider>
      <PrayerList day={day} upcoming="asr" />
    </ThemeProvider>,
  );
  for (const label of ['Günçıxma', 'Günbatımı', 'Gecəyarısı'])
    expect(screen.queryByLabelText(new RegExp(`^${label}, `))).not.toBeOnTheScreen();
  expect(screen.getByLabelText('Sübh, 05:25')).toBeOnTheScreen();
  await act(async () => usePreferences.getState().toggleField('sunrise'));
  await view.rerender(
    <ThemeProvider>
      <PrayerList day={day} upcoming="asr" />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText('Günçıxma, 06:44')).toBeOnTheScreen();
});
test('day navigation reaches December then shows the missing-data state past coverage', async () => {
  jest.mocked(useToday).mockReturnValue('2026-12-31');
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-12-31T02:50:00Z'));
  const view = await render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('15:43')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Növbəti gün'));
  expect(screen.getByText('Bu tarix üçün təqvim yoxdur')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Vaxtları paylaş' })).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Əvvəlki gün'));
  await view.rerender(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
  expect(screen.getByText('15:43')).toBeOnTheScreen();
});
test('kerahat card appears only when enabled and is hidden again when disabled', async () => {
  await render(
    <ThemeProvider>
      <KerahatTimesCard />
    </ThemeProvider>,
  );
  expect(screen.queryByText('Kərahət vaxtları')).not.toBeOnTheScreen();
  await act(async () => usePreferences.getState().set({ showKerahat: true }));
  expect(screen.getByText('Kərahət vaxtları')).toBeOnTheScreen();
  expect(screen.getByText('Kərahət vaxtıdır')).toBeOnTheScreen();
  expect(screen.getByText('06:44 – 07:29')).toBeOnTheScreen();
  await act(async () => usePreferences.getState().set({ showKerahat: false }));
  expect(screen.queryByText('Kərahət vaxtları')).not.toBeOnTheScreen();
});

test('daytime hero keeps the next prayer without a separate sunrise countdown', async () => {
  await render(
    <ThemeProvider>
      <NextPrayerCard onPrayerChange={jest.fn()} />
    </ThemeProvider>,
  );
  expect(screen.queryByText('NÖVBƏTİ NAMAZ')).not.toBeOnTheScreen();
  expect(screen.getByText('Zöhr')).toBeOnTheScreen();
  expect(screen.queryByText('Günçıxma')).not.toBeOnTheScreen();
});

test('after İşa the hero counts down to İmsak with its own time labels', async () => {
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T17:00:00Z'));
  const onPrayerChange = jest.fn();
  await render(
    <ThemeProvider>
      <NextPrayerCard onPrayerChange={onPrayerChange} />
    </ThemeProvider>,
  );
  expect(screen.getByText('İMSAK VAXTI')).toBeOnTheScreen();
  expect(screen.getByText('İmsak')).toBeOnTheScreen();
  expect(screen.queryByText('İmsaka qalan vaxt')).not.toBeOnTheScreen();
  expect(screen.getByLabelText('İmsak vaxtı 05:21 vaxtındadır.')).toBeOnTheScreen();
  expect(onPrayerChange).toHaveBeenLastCalledWith('imsak', '2026-10-09', 'start');
  expect(screen.queryByText('Günçıxma')).not.toBeOnTheScreen();
  expect(screen.queryByText('Sabah · 06:45')).not.toBeOnTheScreen();
  expect(screen.queryByLabelText('İşadan günçıxmaya qədər keçən vaxt')).not.toBeOnTheScreen();
});
test('hero progress continues across midnight until İmsak, then resets for Sübh', async () => {
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T19:59:59Z'));
  const onPrayerChange = jest.fn();
  const card = () => (
    <ThemeProvider>
      <NextPrayerCard onPrayerChange={onPrayerChange} />
    </ThemeProvider>
  );
  const view = await render(card());
  expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', {
    min: 0,
    max: 100,
    now: 46,
  });

  jest.mocked(useToday).mockReturnValue('2026-10-09');
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T20:00:00Z'));
  await view.rerender(card());
  expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', {
    min: 0,
    max: 100,
    now: 46,
  });
  expect(screen.getByText('İmsak')).toBeOnTheScreen();

  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T22:00:00Z'));
  await view.rerender(card());
  expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', {
    min: 0,
    max: 100,
    now: 66,
  });

  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-09T01:21:00Z'));
  await view.rerender(card());
  expect(screen.getByText('Sübh')).toBeOnTheScreen();
  expect(screen.getByText('00:05:00')).toBeOnTheScreen();
  expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', {
    min: 0,
    max: 100,
    now: 0,
  });
  expect(screen.queryByText('İmsaka qalan vaxt')).not.toBeOnTheScreen();
  expect(onPrayerChange).toHaveBeenLastCalledWith('fajr', '2026-10-09', 'start');

  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-09T01:23:30Z'));
  await view.rerender(card());
  expect(screen.getByText('00:02:30')).toBeOnTheScreen();
  expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', {
    min: 0,
    max: 100,
    now: 50,
  });

  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-09T01:26:00Z'));
  await view.rerender(card());
  expect(screen.getByRole('progressbar', { name: 'Sübh vaxtının irəliləyişi' })).toHaveProp(
    'accessibilityValue',
    { min: 0, max: 100, now: 0 },
  );
  expect(onPrayerChange).toHaveBeenLastCalledWith('fajr', '2026-10-09', 'end');
});
test('Sübh hero counts down to sunrise and changes to Zöhr exactly at sunrise', async () => {
  const day = datasetSchema.parse(dataset).records[7]!;
  const onPrayerChange = jest.fn();
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T02:00:00Z'));
  const view = await render(
    <ThemeProvider>
      <NextPrayerCard onPrayerChange={onPrayerChange} />
    </ThemeProvider>,
  );
  expect(screen.getByText('SÜBH NAMAZI')).toBeOnTheScreen();
  expect(screen.queryByText('Sübhün bitməsinə qalan vaxt')).not.toBeOnTheScreen();
  expect(screen.getByText(`Günçıxma · ${day.sunrise}`)).toBeOnTheScreen();
  expect(screen.getByText('00:44:00')).toBeOnTheScreen();
  expect(screen.queryByText('Zöhr')).not.toBeOnTheScreen();
  expect(onPrayerChange).toHaveBeenLastCalledWith('fajr', '2026-10-08', 'end');
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T02:44:00Z'));
  await view.rerender(
    <ThemeProvider>
      <NextPrayerCard onPrayerChange={onPrayerChange} />
    </ThemeProvider>,
  );
  expect(screen.getByText('Zöhr')).toBeOnTheScreen();
  expect(screen.queryByText('Sübhün bitməsinə qalan vaxt')).not.toBeOnTheScreen();
  expect(onPrayerChange).toHaveBeenLastCalledWith('dhuhr', '2026-10-08', 'start');
});
test('active Sübh row uses an ongoing label and retains its prayer start time', async () => {
  const day = datasetSchema.parse(dataset).records[7]!;
  await render(
    <ThemeProvider>
      <PrayerList day={day} upcoming="fajr" ending />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText('Sübh, 05:25, vaxtı davam edir')).toBeOnTheScreen();
  expect(screen.getByText('Vaxtı davam edir')).toBeOnTheScreen();
  expect(screen.queryByText('Növbəti namaz')).not.toBeOnTheScreen();
});
test('kerahat source details stay available behind the information button', async () => {
  usePreferences.setState({ showKerahat: true });
  await render(
    <ThemeProvider>
      <KerahatTimesCard />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByLabelText('Kərahət vaxtları haqqında'));
  expect(screen.getByText('Mənbə: Diyanət · kərahət vaxtları')).toBeOnTheScreen();
});

test('kerahat reports only a running interval and follows the selected period length', async () => {
  usePreferences.setState({ showKerahat: true });
  // 11:45 in Bakı: inside Zəval only while that period is longer than the 43 minutes to Zöhr.
  jest.mocked(useActiveClock).mockReturnValue(Date.parse('2026-10-08T07:45:00Z'));
  await render(
    <ThemeProvider>
      <KerahatTimesCard />
    </ThemeProvider>,
  );
  expect(screen.queryByText('Kərahət vaxtıdır')).not.toBeOnTheScreen();
  expect(screen.queryByText('Bu gün · Hənəfi · təxmini')).not.toBeOnTheScreen();
  await act(async () =>
    usePreferences.getState().set({ kerahatDurations: { morning: 45, noon: 45, evening: 45 } }),
  );
  expect(screen.getByText('Kərahət vaxtıdır')).toBeOnTheScreen();
  expect(screen.getByText('Bitməsinə qalan vaxt')).toBeOnTheScreen();
  await act(async () =>
    usePreferences.getState().set({ kerahatDurations: { morning: 45, noon: 0, evening: 45 } }),
  );
  expect(screen.queryByText('Kərahət vaxtıdır')).not.toBeOnTheScreen();
  expect(screen.queryByText('Zəval')).not.toBeOnTheScreen();
});

test('period controls support exact input and adjust only the selected period', async () => {
  await render(
    <ThemeProvider>
      <KerahatDurationSettings />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText('Günçıxma kərahəti, dəqiqə')).toHaveProp('value', '45');
  const noon = screen.getByLabelText('Zəval kərahəti, dəqiqə');
  await fireEvent.changeText(noon, '37');
  await fireEvent(noon, 'blur');
  expect(usePreferences.getState().kerahatDurations).toEqual({
    morning: 45,
    noon: 37,
    evening: 45,
  });
  await fireEvent.press(screen.getByLabelText('Günbatımı kərahətini 5 dəqiqə artır'));
  expect(usePreferences.getState().kerahatDurations).toEqual({
    morning: 45,
    noon: 37,
    evening: 50,
  });
});

test('period minutes typed without a blur still reach the stored settings', async () => {
  const view = await render(
    <ThemeProvider>
      <KerahatDurationSettings />
    </ThemeProvider>,
  );
  await fireEvent.changeText(screen.getByLabelText('Günçıxma kərahəti, dəqiqə'), '20');
  // Switching tabs takes the tap without blurring the field and unmounts the screen.
  await view.unmount();
  expect(usePreferences.getState().kerahatDurations.morning).toBe(20);
});

test('period controls reject invalid values and stop at zero and 120 minutes', async () => {
  await render(
    <ThemeProvider>
      <KerahatDurationSettings />
    </ThemeProvider>,
  );
  const input = screen.getByLabelText('Günçıxma kərahəti, dəqiqə');
  await fireEvent.changeText(input, '121');
  await fireEvent(input, 'blur');
  expect(screen.getByText('0–120 dəqiqə daxil edin.')).toBeOnTheScreen();
  expect(usePreferences.getState().kerahatDurations.morning).toBe(45);
  await fireEvent.changeText(input, '0');
  await fireEvent(input, 'blur');
  expect(screen.getByLabelText('Günçıxma kərahətini 5 dəqiqə azalt')).toBeDisabled();
  await fireEvent.changeText(input, '120');
  await fireEvent(input, 'blur');
  expect(screen.getByLabelText('Günçıxma kərahətini 5 dəqiqə artır')).toBeDisabled();
});

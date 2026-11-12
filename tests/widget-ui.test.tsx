import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import Widgets from '../app/widgets';
import { ThemeProvider } from '../src/theme';
import { defaultPreferences, usePreferences } from '../src/store/preferences';
import { pinWidget } from '../src/features/widgets/service';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/features/widgets/service', () => ({ pinWidget: jest.fn(async () => true) }));
jest.mock('../src/hooks/useToday', () => ({ useToday: () => '2026-10-22' }));
jest.mock('../src/hooks/useActiveClock', () => ({
  useActiveClock: () => Date.parse('2026-10-22T11:30:00Z'),
}));
jest.mock('../src/hooks/usePrayerDays', () => ({
  usePrayerDays: () => ({
    data: require('../data/verified/2026.json').records.filter(
      (day: { locationId: string; date: string }) =>
        day.locationId === 'qmi-1' && day.date === '2026-10-22',
    ),
  }),
}));
const originalOS = Platform.OS;
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  usePreferences.setState(defaultPreferences);
});
afterEach(() => {
  Platform.OS = originalOS;
});

test('the three live previews omit the removed words and can pin each size', async () => {
  await render(
    <ThemeProvider>
      <Widgets />
    </ThemeProvider>,
  );
  expect(screen.queryByText(/növbəti namaz/i)).not.toBeOnTheScreen();
  expect(screen.queryByText(/qalıb/)).not.toBeOnTheScreen();
  expect(screen.getAllByText('38 dəq')).toHaveLength(3);
  for (const [index, variant] of ['large', 'compact', 'small'].entries()) {
    await act(async () => {
      fireEvent.press(screen.getAllByRole('button', { name: 'Ana ekrana əlavə et' })[index]!);
    });
    expect(pinWidget).toHaveBeenLastCalledWith(variant);
  }
});

test('launchers without pin support show the manual adding instructions', async () => {
  jest.mocked(pinWidget).mockResolvedValueOnce(false);
  await render(
    <ThemeProvider>
      <Widgets />
    </ThemeProvider>,
  );
  await act(async () => {
    fireEvent.press(screen.getAllByRole('button', { name: 'Ana ekrana əlavə et' })[0]!);
  });
  expect(alert).toHaveBeenCalledWith(
    'Ana ekrana əlavə edin',
    expect.stringContaining('boş sahəni basılı saxlayın'),
  );
});

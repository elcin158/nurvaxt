import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Cities from '../app/cities';
import { defaultPreferences, usePreferences } from '../src/store/preferences';
import { ThemeProvider } from '../src/theme';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

beforeEach(() => {
  jest.clearAllMocks();
  usePreferences.setState({
    ...defaultPreferences,
    locationId: 'qmi-79',
    recentLocations: ['qmi-79'],
  });
});

test.each([
  ['Ağsu', 'qmi-67'],
  ['Xankəndi', 'qmi-80'],
])(
  'selecting %s after Abşeron accepts only one press while the picker closes',
  async (name, id) => {
    await render(
      <ThemeProvider>
        <Cities />
      </ThemeProvider>,
    );
    await fireEvent.changeText(screen.getByLabelText('Şəhər axtar'), name);
    const choice = screen.getByRole('radio', { name });

    await act(async () => {
      fireEvent.press(choice);
      fireEvent.press(choice);
    });

    expect(usePreferences.getState().locationId).toBe(id);
    expect(usePreferences.getState().recentLocations).toEqual([id, 'qmi-79']);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Bağla' }));
    expect(usePreferences.getState().locationId).toBe(id);
    expect(router.back).toHaveBeenCalledTimes(1);
  },
);

test('the visible list and recent chips stay in place until the selecting picker unmounts', async () => {
  const view = await render(
    <ThemeProvider>
      <Cities />
    </ThemeProvider>,
  );
  const initialOrder = screen.getAllByRole('radio').map((row) => row.props.accessibilityLabel);
  await fireEvent.press(screen.getByRole('radio', { name: 'Ağsu' }));

  expect(usePreferences.getState().locationId).toBe('qmi-67');
  expect(screen.getAllByRole('radio').map((row) => row.props.accessibilityLabel)).toEqual(
    initialOrder,
  );
  expect(screen.queryByRole('button', { name: 'Ağsu' })).not.toBeOnTheScreen();

  // Native dismissal is asynchronous: a tap on the old recent chip must not undo the choice.
  await fireEvent.press(screen.getByRole('button', { name: 'Abşeron' }));
  expect(usePreferences.getState().locationId).toBe('qmi-67');
  expect(router.back).toHaveBeenCalledTimes(1);

  await view.unmount();
  await render(
    <ThemeProvider>
      <Cities />
    </ThemeProvider>,
  );
  expect(screen.getAllByRole('radio')[0]).toHaveProp('accessibilityLabel', 'Ağsu');
  expect(screen.getByRole('radio', { name: 'Ağsu' })).toBeChecked();
  expect(screen.getByRole('button', { name: 'Ağsu' })).toBeOnTheScreen();

  // Reopening starts a fresh selection, including when using a recent chip.
  await fireEvent.press(screen.getByRole('button', { name: 'Abşeron' }));
  expect(usePreferences.getState().locationId).toBe('qmi-79');
  expect(router.back).toHaveBeenCalledTimes(2);
});

test('closing the picker accepts one dismissal and leaves the selected city unchanged', async () => {
  await render(
    <ThemeProvider>
      <Cities />
    </ThemeProvider>,
  );
  const close = screen.getByRole('button', { name: 'Bağla' });
  await act(async () => {
    fireEvent.press(close);
    fireEvent.press(close);
    fireEvent.press(screen.getByRole('radio', { name: 'Ağsu' }));
  });
  expect(usePreferences.getState().locationId).toBe('qmi-79');
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();
});

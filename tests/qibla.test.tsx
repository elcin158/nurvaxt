import { render, screen, act, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme';
import { usePreferences, defaultPreferences } from '../src/store/preferences';
import Qibla from '../app/(tabs)/qibla';
import {
  bearingDelta,
  compassPoint,
  distanceToKaaba,
  locationCoordinates,
  magneticHeading,
  MAGNETIC_DECLINATION,
  normalizeAngle,
  qiblaBearing,
  type Vector,
} from '../src/features/qibla/domain';
import locations from '../data/locations.json';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-haptics', () => ({ selectionAsync: () => Promise.resolve() }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
const mockSensor = { magnetometer: null as null | ((v: Vector) => void), available: true };
const mockPosition = {
  granted: true,
  canAskAgain: true,
  services: true,
  enableThrows: false,
  enableCalls: 0,
  latitude: 41.0922,
  longitude: 45.3661,
};
jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1 },
  requestForegroundPermissionsAsync: () =>
    Promise.resolve({ granted: mockPosition.granted, canAskAgain: mockPosition.canAskAgain }),
  hasServicesEnabledAsync: () => Promise.resolve(mockPosition.services),
  enableNetworkProviderAsync: () => {
    mockPosition.enableCalls += 1;
    return mockPosition.enableThrows ? Promise.reject(new Error('refused')) : Promise.resolve();
  },
  getLastKnownPositionAsync: () => Promise.resolve(null),
  getCurrentPositionAsync: () =>
    Promise.resolve({
      coords: { latitude: mockPosition.latitude, longitude: mockPosition.longitude },
    }),
}));
jest.mock('expo-sensors', () => ({
  Magnetometer: {
    isAvailableAsync: () => Promise.resolve(mockSensor.available),
    setUpdateInterval: () => {},
    addListener: (listener: (v: Vector) => void) => {
      mockSensor.magnetometer = listener;
      return { remove: () => (mockSensor.magnetometer = null) };
    },
  },
  Accelerometer: {
    setUpdateInterval: () => {},
    // The screen falls back to a flat phone until a sample arrives, which is what we want here.
    addListener: () => ({ remove: () => {} }),
  },
}));
beforeEach(() => {
  usePreferences.setState(defaultPreferences);
  mockSensor.available = true;
  mockSensor.magnetometer = null;
  mockPosition.granted = true;
  mockPosition.canAskAgain = true;
  mockPosition.services = true;
  mockPosition.enableThrows = false;
  mockPosition.enableCalls = 0;
});

test('bearings match independently published Qibla directions', () => {
  // Reference cities, so the great-circle formula is checked against values that do not come
  // from this repository: Istanbul 151.6°, New York 58.5°, Jakarta 295.1°.
  expect(qiblaBearing({ latitude: 41.0082, longitude: 28.9784 })).toBeCloseTo(151.6, 0);
  expect(qiblaBearing({ latitude: 40.7128, longitude: -74.006 })).toBeCloseTo(58.5, 0);
  expect(qiblaBearing({ latitude: -6.2, longitude: 106.8 })).toBeCloseTo(295.1, 0);
});
test('degenerate meridian cases point straight along the meridian', () => {
  expect(qiblaBearing({ latitude: 40, longitude: 39.8262 })).toBeCloseTo(180, 6);
  expect(qiblaBearing({ latitude: 0, longitude: 39.8262 })).toBeCloseTo(0, 6);
});
test('every shipped region has coordinates and a southerly bearing', () => {
  locations.forEach((location) => {
    const point = locationCoordinates(location.id);
    expect(point).not.toBeNull();
    expect(point!.latitude).toBeGreaterThan(38.2);
    expect(point!.latitude).toBeLessThan(42.1);
    expect(point!.longitude).toBeGreaterThan(44.6);
    expect(point!.longitude).toBeLessThan(50.6);
    const bearing = qiblaBearing(point!);
    expect(bearing).toBeGreaterThan(190);
    expect(bearing).toBeLessThan(212);
    // Naxçıvan sits at 194.8° and Bakı at 207.2°, straddling the south / south-west boundary.
    expect(['cənub', 'cənub-qərb']).toContain(compassPoint(bearing));
  });
});
test('Baku sits about 2300 km from the Kaaba', () => {
  const baku = locationCoordinates('qmi-1')!;
  expect(qiblaBearing(baku)).toBeCloseTo(207.2, 1);
  expect(Math.round(distanceToKaaba(baku))).toBe(2314);
});
test('unknown region identifiers stay null rather than guessing', () => {
  expect(locationCoordinates('qmi-999')).toBeNull();
});
test('the turn to the Qibla takes the short way round', () => {
  expect(bearingDelta(0, 207)).toBeCloseTo(-153);
  expect(bearingDelta(350, 10)).toBeCloseTo(20);
  expect(bearingDelta(10, 350)).toBeCloseTo(-20);
  expect(bearingDelta(207, 207)).toBeCloseTo(0);
  expect(normalizeAngle(-90)).toBe(270);
});
// Device frame: x right, y towards the top edge, z out of the screen. Azerbaijan's magnetic
// field dips about 58° below horizontal.
const dip = (58 * Math.PI) / 180;
const field = (heading: number) => {
  const angle = (heading * Math.PI) / 180;
  return {
    x: -Math.sin(angle) * Math.cos(dip) * 48,
    y: Math.cos(angle) * Math.cos(dip) * 48,
    z: -Math.sin(dip) * 48,
  };
};
test('a flat phone reads the heading its top edge points at', () => {
  const flat = { x: 0, y: 0, z: 1 };
  expect(magneticHeading(field(0), flat)).toBeCloseTo(0, 4);
  expect(magneticHeading(field(90), flat)).toBeCloseTo(90, 4);
  expect(magneticHeading(field(207), flat)).toBeCloseTo(207, 4);
});
test('tilting the phone up does not swing the heading', () => {
  const tilt = (30 * Math.PI) / 180;
  // Same scene as above, rotated 30° about the device's x axis.
  const gravity = { x: 0, y: Math.sin(tilt), z: Math.cos(tilt) };
  const tilted = {
    x: 0,
    y: Math.cos(tilt + dip) * 48,
    z: -Math.sin(tilt + dip) * 48,
  };
  expect(magneticHeading(tilted, gravity)).toBeCloseTo(0, 4);
});
test('a degenerate reading reports nothing instead of a wrong heading', () => {
  expect(magneticHeading(field(0), { x: 0, y: 0, z: 0 })).toBeNull();
  expect(magneticHeading({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 1 })).toBeNull();
});

/**
 * Renders the screen, then settles the magnetometer availability check inside an act scope so
 * the resolution does not land between renders.
 */
const open = async () => {
  render(
    <ThemeProvider>
      <Qibla />
    </ThemeProvider>,
  );
  await act(async () => {});
};
test('the screen states the bearing and distance for the selected city', async () => {
  await open();
  expect(screen.getByText('207.2° — cənub-qərb')).toBeOnTheScreen();
  expect(screen.getByText('2314 km')).toBeOnTheScreen();
  expect(screen.getByText('Bakı (şəhər mərkəzi)')).toBeOnTheScreen();
});
test('a live reading turns into the shortest way round to the Qibla', async () => {
  await open();
  // Pointing at magnetic north, so true north is 6.5° to the left and the Qibla 159° further.
  await act(async () => mockSensor.magnetometer!(field(0)));
  expect(screen.getByText('159°')).toBeOnTheScreen();
  expect(screen.getByText('sola dönün')).toBeOnTheScreen();
  // Hold the phone on the bearing until the low-pass settles there.
  await act(async () => {
    for (let sample = 0; sample < 20; sample++) {
      mockSensor.magnetometer!(field(207.18 - MAGNETIC_DECLINATION));
    }
  });
  expect(screen.queryByText(/dönün/)).not.toBeOnTheScreen();
  // The heading now reads the Qibla, so the word appears in the dial as well as the title.
  expect(screen.getAllByText('Qiblə')).toHaveLength(2);
});
test('without a magnetometer the bearing is still given to read off another compass', async () => {
  mockSensor.available = false;
  await open();
  expect(screen.getByText('207°')).toBeOnTheScreen();
  expect(screen.getByText(/maqnit sensoru yoxdur/)).toBeOnTheScreen();
});
test('a city the coordinate table does not cover says so instead of pointing anywhere', async () => {
  usePreferences.setState({ ...defaultPreferences, locationId: 'qmi-999' });
  await open();
  expect(screen.getByText('Bu şəhər üçün koordinat yoxdur')).toBeOnTheScreen();
});

test('switching to the precise origin re-aims the bearing at where the phone is', async () => {
  await open();
  expect(screen.getByText('207.2° — cənub-qərb')).toBeOnTheScreen();
  // Qazax, four and a half degrees of longitude west of Bakı, so the bearing has to move.
  await act(async () => fireEvent.press(screen.getByText('Dəqiq yer')));
  expect(screen.getByText('Təxmini məkan')).toBeOnTheScreen();
  expect(screen.getByText('195.1° — cənub')).toBeOnTheScreen();
  expect(usePreferences.getState().qiblaSource).toBe('device');
});
test('a refused location keeps the city bearing and says what happened', async () => {
  mockPosition.granted = false;
  await open();
  await act(async () => fireEvent.press(screen.getByText('Dəqiq yer')));
  expect(screen.getByText(/Məkan icazəsi verilmədi/)).toBeOnTheScreen();
  expect(screen.getByText('207.2° — cənub-qərb')).toBeOnTheScreen();
});

test('a switched-off location service gets Android\u2019s own prompt to turn it back on', async () => {
  const { PermissionsAndroid, Platform } = require('react-native');
  const original = Platform.OS;
  Platform.OS = 'android';
  const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted');
  mockPosition.services = false;
  mockPosition.enableThrows = true;
  try {
    await open();
    await act(async () => fireEvent.press(screen.getByText('Dəqiq yer')));
    // The system dialog was raised; this run has the reader declining it.
    expect(mockPosition.enableCalls).toBe(1);
    expect(screen.getByText(/məkan xidməti sönülüdür/)).toBeOnTheScreen();
    mockPosition.enableThrows = false;
    mockPosition.services = true;
    await act(async () => fireEvent.press(screen.getByText('Yenidən cəhd et')));
    expect(screen.getByText('Təxmini məkan')).toBeOnTheScreen();
  } finally {
    Platform.OS = original;
    request.mockRestore();
  }
});
test('a permanently refused permission points at the system settings', async () => {
  mockPosition.granted = false;
  mockPosition.canAskAgain = false;
  await open();
  await act(async () => fireEvent.press(screen.getByText('Dəqiq yer')));
  expect(screen.getByText(/icazəsi bağlıdır/)).toBeOnTheScreen();
  expect(screen.getByText('Ayarları aç')).toBeOnTheScreen();
});

test('Android asks for the approximate permission on its own', async () => {
  // expo-location's own request bundles the precise permission, which this app strikes out of
  // the manifest, so the Android path has to go straight to the approximate one.
  const { PermissionsAndroid, Platform } = require('react-native');
  const original = Platform.OS;
  Platform.OS = 'android';
  const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted');
  try {
    await open();
    await act(async () => fireEvent.press(screen.getByText('Dəqiq yer')));
    expect(request).toHaveBeenCalledWith('android.permission.ACCESS_COARSE_LOCATION');
    expect(screen.getByText('Təxmini məkan')).toBeOnTheScreen();
  } finally {
    Platform.OS = original;
    request.mockRestore();
  }
});
test('a permission Android will not ask about again points at the settings', async () => {
  const { PermissionsAndroid, Platform } = require('react-native');
  const original = Platform.OS;
  Platform.OS = 'android';
  const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('never_ask_again');
  try {
    await open();
    await act(async () => fireEvent.press(screen.getByText('Dəqiq yer')));
    expect(screen.getByText('Ayarları aç')).toBeOnTheScreen();
  } finally {
    Platform.OS = original;
    request.mockRestore();
  }
});

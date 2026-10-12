import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import * as Location from 'expo-location';
import type { Coordinates } from './domain';
export type OriginStatus =
  | 'idle'
  | 'locating'
  | 'ready'
  /** Refused this time, but the system will ask again. */
  | 'denied'
  /** Refused for good; only the system settings can undo it. */
  | 'blocked'
  /** Permission is there, but the device's location service is switched off. */
  | 'disabled'
  | 'unavailable';
export type OriginState = {
  coordinates: Coordinates | null;
  status: OriginStatus;
  retry: () => void;
};
/** A cached fix this recent is accurate enough and spares the reader a GPS wait. */
const MAX_AGE_MS = 10 * 60_000;
/**
 * Android only. expo-location asks for the precise and the approximate permission together and
 * reports success only when *both* are granted — and the precise one is deliberately struck out
 * of this app's manifest, so its request could never succeed. Android grants approximate access
 * on its own, and a position read needs just one of the two, so ask for that one directly.
 */
async function askForApproximateLocation() {
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  );
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}
async function askForLocation() {
  if (Platform.OS === 'android') return askForApproximateLocation();
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'denied' : 'blocked';
}
/**
 * An approximate position for the Qibla bearing. Nothing is asked for until the reader turns it
 * on, coarse accuracy is enough (a kilometre of error moves the bearing by a hundredth of a
 * degree), and the coordinates are never written to storage.
 */
export function usePreciseOrigin(enabled: boolean): OriginState {
  const [state, setState] = useState<{ coordinates: Coordinates | null; status: OriginStatus }>({
    coordinates: null,
    status: 'idle',
  });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) {
      setState({ coordinates: null, status: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ coordinates: null, status: 'locating' });
    const resolve = async () => {
      const permission = await askForLocation();
      if (cancelled) return;
      if (permission !== 'granted') {
        setState({ coordinates: null, status: permission });
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        if (cancelled) return;
        // Android can offer to switch location on without leaving the app; iOS cannot.
        if (Platform.OS !== 'android') {
          setState({ coordinates: null, status: 'disabled' });
          return;
        }
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          if (!cancelled) setState({ coordinates: null, status: 'disabled' });
          return;
        }
        if (cancelled) return;
      }
      const position =
        (await Location.getLastKnownPositionAsync({ maxAge: MAX_AGE_MS })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));
      if (cancelled) return;
      setState({
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        status: 'ready',
      });
    };
    resolve().catch(() => {
      if (!cancelled) setState({ coordinates: null, status: 'unavailable' });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);
  return { ...state, retry };
}

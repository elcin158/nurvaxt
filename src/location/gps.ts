import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { acceptable, MAX_AGE_MS, type Fix } from './fix';

export { acceptable, DEFAULT_MAX_ACCURACY, type Fix } from './fix';

/**
 * Why the device cannot give a GPS-grade position. Only a granted, precise ("fine" / "full")
 * permission with location services on counts: an approximate position is kilometres off.
 */
export type Access = 'granted' | 'undetermined' | 'denied' | 'blocked' | 'approximate' | 'services-off';

export async function checkAccess(): Promise<Access> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return permission.status === 'undetermined' ? 'undetermined' : permission.canAskAgain ? 'denied' : 'blocked';
  if (permission.ios?.accuracy === 'reduced' || permission.android?.accuracy === 'coarse') return 'approximate';
  return await Location.hasServicesEnabledAsync() ? 'granted' : 'services-off';
}
/** Asks the system for what is missing; what cannot be asked for in the app is left to the settings. */
export async function requestAccess(): Promise<Access> {
  const before = await checkAccess();
  if (before === 'undetermined' || before === 'denied' || before === 'approximate' && Platform.OS === 'android')
    await Location.requestForegroundPermissionsAsync();
  // Android can turn the location services on from a system dialog; iOS only from the settings.
  if (await checkAccess() === 'services-off' && Platform.OS === 'android')
    await Location.enableNetworkProviderAsync().catch(() => { /* refused: the gate says so */ });
  return checkAccess();
}
export const openSettings = () => void Linking.openSettings();

export const accessMessage: Record<Exclude<Access, 'granted'>, string> = {
  undetermined: 'Hər addım saxlananda və əməliyyat icra ediləndə yeriniz GPS ilə qeyd olunur. Bu, sahə işinin təsdiqi üçündür; məkan yalnız forma açıq olanda istifadə edilir.',
  denied: 'Məkana icazə verilməyib. Qeydi redaktə etmək üçün tətbiqə məkan icazəsi verin.',
  blocked: 'Məkana icazə ayarlarda bağlanıb. Ayarlarda EVTAS üçün məkanı «Tətbiqdən istifadə edərkən» seçin.',
  approximate: Platform.OS === 'ios'
    ? 'Yalnız təxmini məkana icazə var. Ayarlarda EVTAS üçün «Dəqiq məkan»ı açın.'
    : 'Yalnız təxmini məkana icazə var. EVTAS üçün «Dəqiq» məkana icazə verin.',
  'services-off': 'Cihazda məkan xidməti söndürülüb. GPS-i açın.',
};

function toFix(position: Location.LocationObject): Fix | null {
  const { latitude, longitude, accuracy } = position.coords;
  if (accuracy == null || !Number.isFinite(accuracy)) return null;
  return { latitude, longitude, accuracy, isMock: position.mocked ?? null, capturedAt: new Date(position.timestamp).toISOString() };
}
/** Why a position is not taken, for the operator. */
export function fixProblem(fix: Fix | null, maxAccuracy: number): string {
  if (!fix) return 'GPS axtarılır… Pəncərəyə və ya açıq yerə yaxınlaşın.';
  if (fix.isMock === true) return 'Saxta məkan aşkarlandı. Məkanı dəyişən tətbiqi söndürün.';
  if (fix.accuracy > maxAccuracy) return `GPS dəqiqliyi ${Math.round(fix.accuracy)} m (tələb: ${maxAccuracy} m). Pəncərəyə və ya açıq yerə yaxınlaşın.`;
  return 'GPS məkanı köhnədir. Yenilənməsini gözləyin.';
}

/**
 * Follows the position while a form is open, so a fix is ready when a step is saved; a first fix
 * without the network (no A-GPS) can take minutes. Stops when the form closes or `active` ends.
 */
export function useGps(active: boolean, maxAccuracy: number) {
  const [latest, setLatest] = useState<Fix | null>(null);
  const best = useRef<Fix | null>(null);
  useEffect(() => {
    if (!active) return;
    let subscription: Location.LocationSubscription | null = null, cancelled = false;
    // The last known position may already be good enough to start with.
    void Location.getLastKnownPositionAsync({ maxAge: MAX_AGE_MS, requiredAccuracy: maxAccuracy }).then(position => {
      const fix = position && toFix(position);
      if (!cancelled && fix && !best.current) { best.current = fix; setLatest(fix); }
    }).catch(() => {});
    void Location.watchPositionAsync({ accuracy: Location.Accuracy.Highest, timeInterval: 5000, distanceInterval: 0 }, position => {
      const fix = toFix(position);
      if (cancelled || !fix) return;
      setLatest(fix);
      // A worse reading does not replace a good one that is still fresh: the operator has not moved far.
      if (acceptable(fix, maxAccuracy) || !acceptable(best.current, maxAccuracy)) best.current = fix;
    }).then(value => { if (cancelled) value.remove(); else subscription = value; }).catch(() => {});
    return () => { cancelled = true; subscription?.remove(); best.current = null; setLatest(null); };
  }, [active, maxAccuracy]);
  return {
    /** The latest reading, for the indicator. */
    latest,
    /** The position to record now, or null when there is no acceptable one. */
    current: () => acceptable(best.current, maxAccuracy) ? best.current : null,
  };
}

/** A one-off position for an online action; refused unless GPS-grade. */
export async function currentFix(maxAccuracy: number, timeoutMs = 20_000): Promise<Fix> {
  const access = await checkAccess() === 'granted' ? 'granted' : await requestAccess();
  if (access !== 'granted') throw new Error(accessMessage[access]);
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: maxAccuracy }).catch(() => null);
  const lastFix = last && toFix(last);
  if (acceptable(lastFix, maxAccuracy)) return lastFix;
  const position = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
    new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
  ]).catch(() => null);
  const fix = position && toFix(position);
  if (!acceptable(fix, maxAccuracy)) throw new Error(fixProblem(fix, maxAccuracy));
  return fix;
}

/** The form header's GPS state: the error radius once there is a reading. */
export function gpsLabel(latest: Fix | null, maxAccuracy: number) {
  if (!latest) return 'GPS axtarılır…';
  if (latest.isMock === true) return 'GPS: saxta məkan';
  return `GPS ±${Math.round(latest.accuracy)} m${latest.accuracy > maxAccuracy ? ' · zəif' : ''}`;
}

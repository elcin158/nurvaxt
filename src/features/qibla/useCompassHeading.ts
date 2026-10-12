import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Easing, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import { MAGNETIC_DECLINATION, magneticHeading, normalizeAngle, type Vector } from './domain';
/**
 * Core Motion reports gravity with the opposite sign to Android's sensor stack. The levelling
 * maths follows Android's convention, so iOS samples are flipped on the way in; if a compass
 * ever reads mirrored on one platform, this constant is the thing to check first.
 */
const GRAVITY_SIGN = Platform.OS === 'ios' ? -1 : 1;
const UPDATE_MS = 100;
/** The raw field jitters a couple of degrees per sample; this low-pass settles it without lag. */
const SMOOTHING = 0.3;
export type CompassState = {
  /**
   * True-north heading as an unwrapped angle that keeps counting past 360°, so the dial always
   * turns the short way. Driven on the UI thread: moving the phone costs no React render.
   */
  rotation: SharedValue<number>;
  /** The same heading for the written readout, re-rendered only when the whole degree changes. */
  heading: number | null;
  status: 'pending' | 'ready' | 'unavailable';
};
export function useCompassHeading(active: boolean): CompassState {
  const [state, setState] = useState<Omit<CompassState, 'rotation'>>({
    heading: null,
    status: 'pending',
  });
  const rotation = useSharedValue(0);
  const gravity = useRef<Vector>({ x: 0, y: 0, z: 1 });
  const smoothed = useRef<{ x: number; y: number } | null>(null);
  const unwrapped = useRef(0);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const subscriptions: { remove: () => void }[] = [];
    Magnetometer.isAvailableAsync()
      .then((availableAsync) => {
        if (cancelled) return;
        if (!availableAsync) {
          setState({ heading: null, status: 'unavailable' });
          return;
        }
        Magnetometer.setUpdateInterval(UPDATE_MS);
        Accelerometer.setUpdateInterval(UPDATE_MS);
        subscriptions.push(
          Accelerometer.addListener(({ x, y, z }) => {
            gravity.current = { x: x * GRAVITY_SIGN, y: y * GRAVITY_SIGN, z: z * GRAVITY_SIGN };
          }),
        );
        subscriptions.push(
          Magnetometer.addListener((field) => {
            const magnetic = magneticHeading(field, gravity.current);
            if (magnetic === null) return;
            const radians = ((magnetic + MAGNETIC_DECLINATION) * Math.PI) / 180;
            // Averaged as a unit vector, so the smoothing does not fight the 359°/0° seam.
            const sample = { x: Math.cos(radians), y: Math.sin(radians) };
            const previous = smoothed.current;
            const next = previous
              ? {
                  x: previous.x + (sample.x - previous.x) * SMOOTHING,
                  y: previous.y + (sample.y - previous.y) * SMOOTHING,
                }
              : sample;
            smoothed.current = next;
            const heading = normalizeAngle((Math.atan2(next.y, next.x) * 180) / Math.PI);
            // Unwrap: step by the short way round, so 359°->1° nudges forward instead of
            // spinning the dial most of a turn backwards.
            unwrapped.current += ((((heading - unwrapped.current) % 360) + 540) % 360) - 180;
            rotation.value = withTiming(unwrapped.current, {
              duration: UPDATE_MS + 20,
              easing: Easing.linear,
            });
            const degree = Math.round(heading);
            setState((current) =>
              current.status === 'ready' &&
              current.heading !== null &&
              Math.round(current.heading) === degree
                ? current
                : { heading, status: 'ready' },
            );
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setState({ heading: null, status: 'unavailable' });
      });
    return () => {
      cancelled = true;
      subscriptions.forEach((subscription) => subscription.remove());
      smoothed.current = null;
    };
  }, [active, rotation]);
  return { ...state, rotation };
}

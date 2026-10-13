import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { Fix } from '../location/fix';
import { UNKNOWN_STEP, type StepChange } from './events';

/**
 * Turns a form's local saves into step saves, as the web's "Yadda saxla" would have written them:
 * at each checkpoint - leaving a step or a record form, closing the form, the app going to the
 * background - what changed since the last one is recorded with the GPS position of that moment.
 * Returns the checkpoint; `final` is the form closing.
 */
export function useStepHistory<T>({ enabled, data, diff, location, record, unconfirmed }: {
  enabled: boolean; data: T; diff(before: T, after: T): StepChange[]; location(): Fix | null;
  record(steps: StepChange[], location: Fix | null): void;
  /** Whether the record holds unsent changes no step save stands for: one saved before the history existed. */
  unconfirmed(): boolean;
}) {
  const baseline = useRef(data), checkpoint = useRef((final?: boolean) => { void final; });
  useEffect(() => {
    checkpoint.current = (final = false) => {
      if (!enabled) return;
      let steps = diff(baseline.current, data);
      baseline.current = data;
      if (final && !steps.length && unconfirmed()) steps = [{ step: UNKNOWN_STEP, changes: [] }];
      record(steps, location());
    };
  });
  // A form taken away without closing (the permission withdrawn, the app locked) still records what it changed.
  useEffect(() => () => checkpoint.current(), []);
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') checkpoint.current(); });
    return () => subscription.remove();
  }, [enabled]);
  return (final = false) => checkpoint.current(final);
}

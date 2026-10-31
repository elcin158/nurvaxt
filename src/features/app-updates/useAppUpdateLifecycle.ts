import { useEffect } from 'react';
import { AppState } from 'react-native';
import { appUpdates } from './service';

export function useAppUpdateLifecycle(ready: boolean, onboarded: boolean) {
  useEffect(() => {
    // Establish the install baseline before a new user completes onboarding.
    if (ready) void appUpdates.prepare(onboarded);
  }, [ready, onboarded]);
  useEffect(() => {
    if (!ready || !onboarded) return;
    const disconnect = appUpdates.connect();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') appUpdates.foreground();
    });
    return () => {
      subscription.remove();
      disconnect();
    };
  }, [ready, onboarded]);
}

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { appUpdates } from './service';

export function useAppUpdateLifecycle(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const disconnect = appUpdates.connect();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') appUpdates.foreground();
    });
    return () => {
      subscription.remove();
      disconnect();
    };
  }, [enabled]);
}

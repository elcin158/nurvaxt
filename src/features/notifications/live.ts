import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Alarm, { type LiveNotificationAccess } from '../../../modules/nurvaxt-alarm/src';

const unavailable: LiveNotificationAccess = {
  mode: 'unsupported',
  enabled: false,
  canOpenSettings: false,
  promoted: false,
  notificationsAllowed: false,
};

export function readLiveNotificationAccess(): LiveNotificationAccess {
  if (Platform.OS !== 'android') return unavailable;
  try {
    return Alarm?.liveNotificationAccess?.() ?? unavailable;
  } catch {
    return unavailable;
  }
}

export function openLiveNotificationSettings() {
  try {
    return Platform.OS === 'android' && (Alarm?.openLiveNotificationSettings?.() ?? false);
  } catch {
    return false;
  }
}

export function useLiveNotificationAccess() {
  const [access, setAccess] = useState(readLiveNotificationAccess);
  const refresh = useCallback(() => setAccess(readLiveNotificationAccess()), []);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => listener.remove();
  }, [refresh]);
  return { access, refresh };
}

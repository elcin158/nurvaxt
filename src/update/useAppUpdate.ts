import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Application from 'expo-application';
import { apiRequest } from '../auth/api';

// Read from the installed binary, not app config, so support sees the build actually on the device.
export const installedVersion = Application.nativeApplicationVersion ?? '';
export const versionLabel = [installedVersion, Application.nativeBuildVersion && `(${Application.nativeBuildVersion})`].filter(Boolean).join(' ');

type Release = { latest: string; minSupported?: string | null; downloadUrl?: string | null };
export type AppUpdate = { latest: string; required: boolean; downloadUrl: string | null };

// A foreground return checks again only after this long; the server's values change once per release.
const RECHECK_MS = 30 * 60_000;

/** Compares dotted numeric versions ("1.10.0" > "1.9.2"); a missing part counts as 0. */
export function compareVersions(a: string, b: string): number {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

/**
 * The newer release the server announces for this platform, or null. Checked on launch and on
 * returning to the foreground; offline or a failed request leaves the last answer in place, so the
 * app keeps working without a connection.
 */
export function useAppUpdate(): AppUpdate | null {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  useEffect(() => {
    if (!installedVersion || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return;
    let checkedAt = 0, active = true;
    async function check() {
      if (Date.now() - checkedAt < RECHECK_MS) return;
      checkedAt = Date.now();
      try {
        const release = await apiRequest<Release | undefined>('GET', `app/version?platform=${Platform.OS}`, { timeoutMs: 5_000 });
        if (!active) return;
        if (!release?.latest || compareVersions(installedVersion, release.latest) >= 0) { setUpdate(null); return; }
        setUpdate({
          latest: release.latest, downloadUrl: release.downloadUrl ?? null,
          required: !!release.minSupported && compareVersions(installedVersion, release.minSupported) < 0,
        });
      } catch { checkedAt = 0; }
    }
    void check();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    return () => { active = false; listener.remove(); };
  }, []);
  return update;
}

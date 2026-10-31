import type AsyncStorage from '@react-native-async-storage/async-storage';
import { findRelease, releases, type ReleaseNotes } from './releases';

const HISTORY_KEY = 'nurvaxt-release-history';
type History = {
  installedVersionCode: number;
  seenVersionCode: number;
  pendingVersionCode: number | null;
};
type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export function createReleaseHistory(
  storage: Storage,
  installedVersionCode: number,
  catalog: readonly ReleaseNotes[] = releases,
) {
  let history: History;
  let loading: Promise<ReleaseNotes | undefined> | undefined;
  const pending = () => findRelease(history?.pendingVersionCode ?? 0, catalog);
  const persist = () => storage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(() => {});

  function load(existingInstall = false) {
    return (loading ??= (async () => {
      if (installedVersionCode <= 0) return;
      let previous: History | undefined;
      try {
        const raw = await storage.getItem(HISTORY_KEY);
        const value = raw ? (JSON.parse(raw) as Partial<History> | null) : null;
        if (
          value &&
          Number.isSafeInteger(value.installedVersionCode) &&
          Number(value.installedVersionCode) > 0 &&
          Number.isSafeInteger(value.seenVersionCode) &&
          Number(value.seenVersionCode) >= 0 &&
          (value.pendingVersionCode === null ||
            (Number.isSafeInteger(value.pendingVersionCode) &&
              Number(value.pendingVersionCode) > 0))
        )
          previous = value as History;
      } catch {}

      if (!previous) {
        // Before onboarding, a fresh install establishes a baseline. Existing users
        // migrating from the old card can see this build's important changes once.
        const release = findRelease(installedVersionCode, catalog);
        const introduce = existingInstall && release?.important;
        history = {
          installedVersionCode,
          seenVersionCode: introduce ? 0 : installedVersionCode,
          pendingVersionCode: introduce ? installedVersionCode : null,
        };
      } else {
        history = { ...previous, installedVersionCode };
        if (installedVersionCode !== previous.installedVersionCode) {
          const release = findRelease(installedVersionCode, catalog);
          history.pendingVersionCode =
            installedVersionCode > previous.installedVersionCode &&
            release?.important &&
            history.seenVersionCode < installedVersionCode
              ? installedVersionCode
              : null;
        }
        const release = pending();
        if (
          !release?.important ||
          release.versionCode > installedVersionCode ||
          release.versionCode <= history.seenVersionCode
        )
          history.pendingVersionCode = null;
      }
      await persist();
      return pending();
    })());
  }

  async function markRead(versionCode: number) {
    await load();
    if (!history) return;
    history.seenVersionCode = Math.max(history.seenVersionCode, versionCode);
    if ((history.pendingVersionCode ?? Infinity) <= history.seenVersionCode)
      history.pendingVersionCode = null;
    await persist();
  }

  return { load, markRead };
}

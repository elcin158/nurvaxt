import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import Updates, { type PlayUpdateInfo } from '../../../modules/nurvaxt-updates/src';
import { createReleaseFeed } from './release-feed';
import { createReleaseHistory } from './release-history';
import { findRelease, releases, type ReleaseNotes } from './releases';
import { installedVersionCode } from './version';

const DISMISSAL_KEY = 'nurvaxt-update-dismissal';
const DAY = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL = 15 * 60 * 1000;
type Dismissal = { versionCode: number; until: number };
type UpdateStatus = 'idle' | 'available' | 'pending' | 'downloading' | 'downloaded' | 'installing';
type UpdateState = {
  status: UpdateStatus;
  versionCode: number;
  bytesDownloaded: number;
  totalBytes: number;
  panel: 'update' | 'whats-new' | null;
  announcement: ReleaseNotes | null;
  release: ReleaseNotes | null;
  notesLoading: boolean;
  checking: boolean;
  busy: boolean;
  error: string | null;
};
type CheckResult =
  'available' | 'downloaded' | 'downloading' | 'installing' | 'current' | 'unsupported' | 'error';
type NativeUpdates = Pick<
  NonNullable<typeof Updates>,
  'checkForUpdate' | 'startUpdate' | 'completeUpdate' | 'addListener'
>;
type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
type Options = {
  installedVersionCode?: number;
  releases?: readonly ReleaseNotes[];
  loadReleaseNotes?: (versionCode: number, force: boolean) => Promise<ReleaseNotes | undefined>;
};

export function downloadProgress(update: Pick<UpdateState, 'bytesDownloaded' | 'totalBytes'>) {
  return update.totalBytes > 0
    ? Math.max(0, Math.min(100, Math.round((update.bytesDownloaded / update.totalBytes) * 100)))
    : undefined;
}

// Isolated controller keeps the native events, storage and UI on one shared state machine.
export function createUpdateController(
  native: NativeUpdates | null,
  storage: Storage = AsyncStorage,
  now = Date.now,
  options: Options = {},
) {
  const useStore = create<UpdateState>(() => ({
    status: 'idle',
    versionCode: 0,
    bytesDownloaded: 0,
    totalBytes: 0,
    panel: null,
    announcement: null,
    release: null,
    notesLoading: false,
    checking: false,
    busy: false,
    error: null,
  }));
  let dismissal: Dismissal | null = null;
  let loaded: Promise<void> | undefined;
  let lastCheck = -Infinity;
  let revision = 0;
  let request: Promise<CheckResult> | null = null;
  let manualRequested = false;
  let dismissedPanel: Dismissal | null = null;
  const catalog = options.releases ?? releases;
  const history = createReleaseHistory(storage, options.installedVersionCode ?? 0, catalog);
  const notesRequests = new Set<number>();

  function loadReleaseNotes(versionCode: number, force = false) {
    const state = useStore.getState();
    if (
      !options.loadReleaseNotes ||
      state.status === 'idle' ||
      state.release ||
      notesRequests.has(versionCode)
    )
      return;
    notesRequests.add(versionCode);
    useStore.setState({ notesLoading: true });
    void (async () => {
      try {
        const release = await options.loadReleaseNotes!(versionCode, force);
        const current = useStore.getState();
        if (current.versionCode === versionCode && current.status !== 'idle')
          useStore.setState({ release: release?.versionCode === versionCode ? release : null });
      } catch {
        // Release text must never prevent downloading an eligible Play update.
      } finally {
        notesRequests.delete(versionCode);
        if (useStore.getState().versionCode === versionCode)
          useStore.setState({ notesLoading: false });
      }
    })();
  }

  function load(existingInstall = false) {
    return (loaded ??= Promise.all([
      storage
        .getItem(DISMISSAL_KEY)
        .then((raw) => {
          if (!raw) return;
          const value = JSON.parse(raw) as Partial<Dismissal> | null;
          if (value && Number.isInteger(value.versionCode) && Number.isFinite(value.until))
            dismissal = value as Dismissal;
        })
        .catch(() => {}),
      history.load(existingInstall),
    ]).then(([, announcement]) => {
      if (announcement)
        useStore.setState((state) => ({
          announcement,
          panel: state.panel ?? 'whats-new',
        }));
    }));
  }
  function apply(info: PlayUpdateInfo, manual = false): CheckResult {
    const active = ['pending', 'downloading', 'downloaded', 'installing'].includes(info.status);
    const available =
      info.status === 'available' || info.status === 'failed' || info.status === 'cancelled';
    const status: UpdateStatus = active
      ? (info.status as UpdateStatus)
      : available && info.flexibleAllowed
        ? 'available'
        : 'idle';
    const deferred = dismissal?.versionCode === info.versionCode && dismissal.until > now();
    const previous = useStore.getState();
    const release =
      status === 'idle'
        ? null
        : (findRelease(info.versionCode, catalog) ??
          (previous.versionCode === info.versionCode ? previous.release : null));
    if (manual) dismissedPanel = null;
    const hidden = dismissedPanel?.versionCode === info.versionCode && dismissedPanel.until > now();
    const alreadyOpen = previous.panel === 'update' && previous.versionCode === info.versionCode;
    const show = active
      ? !hidden
      : status === 'available' && (alreadyOpen || manual || (!deferred && !hidden));
    useStore.setState({
      status,
      versionCode: info.versionCode,
      bytesDownloaded: info.bytesDownloaded,
      totalBytes: info.totalBytes,
      release,
      notesLoading: status !== 'idle' && !release && notesRequests.has(info.versionCode),
      panel: show ? 'update' : previous.panel === 'update' ? null : previous.panel,
      error: info.status === 'failed' ? 'Yeniləmə yüklənə bilmədi. Yenidən cəhd edin.' : null,
    });
    if (
      status !== 'idle' &&
      !release &&
      (status === 'available' || previous.versionCode !== info.versionCode)
    )
      loadReleaseNotes(info.versionCode, manual);
    return status === 'idle' ? 'current' : status === 'pending' ? 'downloading' : status;
  }
  async function markRead(versionCode: number) {
    await history.markRead(versionCode);
    useStore.setState((state) => {
      if (!state.announcement || state.announcement.versionCode > versionCode) return {};
      return { announcement: null, panel: state.panel === 'whats-new' ? null : state.panel };
    });
  }
  function open() {
    if (useStore.getState().status === 'idle') return;
    dismissedPanel = null;
    useStore.setState({ panel: 'update' });
    loadReleaseNotes(useStore.getState().versionCode);
  }
  async function dismiss() {
    const state = useStore.getState();
    if (state.panel === 'update')
      dismissedPanel = {
        versionCode: state.versionCode,
        until: state.status === 'available' ? now() + DAY : Infinity,
      };
    useStore.setState({ panel: null, error: null });
    await load();
    if (state.panel === 'whats-new' && state.announcement)
      await markRead(state.announcement.versionCode);
    else if (state.panel === 'update' && state.release) await markRead(state.versionCode);
    // Active downloads stay in the background; ready updates return on foreground.
    if (state.panel !== 'update' || state.status !== 'available') return;
    dismissal = { versionCode: state.versionCode, until: now() + DAY };
    await storage.setItem(DISMISSAL_KEY, JSON.stringify(dismissal)).catch(() => {});
  }
  function check(manual = false): Promise<CheckResult> {
    if (!native) return Promise.resolve('unsupported');
    manualRequested ||= manual;
    if (request) return request;
    useStore.setState({ checking: true });
    request = (async () => {
      try {
        await load();
        const before = revision;
        lastCheck = now();
        const info = await native.checkForUpdate();
        // A download event is newer than an in-flight availability response.
        if (before === revision) return apply(info, manualRequested);
        const status = useStore.getState().status;
        return status === 'idle' ? 'current' : status === 'pending' ? 'downloading' : status;
      } catch {
        // Background failures must not interrupt the offline timetable.
        return 'error';
      } finally {
        request = null;
        manualRequested = false;
        useStore.setState({ checking: false });
      }
    })();
    return request;
  }
  async function start() {
    if (!native || useStore.getState().busy) return;
    useStore.setState({ busy: true, error: null });
    try {
      if (useStore.getState().release) {
        await load();
        await markRead(useStore.getState().versionCode);
      }
      const result = await native.startUpdate();
      if (result === 'cancelled') await dismiss();
      else if (result === 'unavailable') await check(true);
      else {
        revision++;
        dismissal = null;
        await storage.removeItem(DISMISSAL_KEY).catch(() => {});
        const state = useStore.getState();
        if (result === 'downloaded') useStore.setState({ status: 'downloaded', panel: 'update' });
        else if (state.status === 'available')
          useStore.setState({ status: 'pending', panel: 'update' });
      }
    } catch {
      useStore.setState({
        error: 'Yeniləmə başlaya bilmədi. İnternet bağlantısını yoxlayıb yenidən cəhd edin.',
        panel: 'update',
      });
    } finally {
      useStore.setState({ busy: false });
    }
  }
  async function install() {
    if (!native || useStore.getState().busy || useStore.getState().status !== 'downloaded') return;
    useStore.setState({ busy: true, error: null });
    try {
      await native.completeUpdate();
      revision++;
      // A newer installed/failed event may have arrived before this promise resolved.
      if (useStore.getState().status === 'downloaded') useStore.setState({ status: 'installing' });
    } catch {
      useStore.setState({
        error: 'Yeniləmə quraşdırıla bilmədi. Yenidən cəhd edin.',
        panel: 'update',
      });
    } finally {
      useStore.setState({ busy: false });
    }
  }
  function connect() {
    if (!native) return () => {};
    let connected = true;
    const subscription = native.addListener('onStateChange', (info) => {
      revision++;
      void load().then(() => {
        if (!connected) return;
        apply(info);
        if (info.status === 'cancelled') void dismiss();
      });
    });
    void check();
    return () => {
      connected = false;
      subscription.remove();
    };
  }
  function foreground() {
    const status = useStore.getState().status;
    dismissedPanel = null;
    if ((status !== 'idle' && status !== 'available') || now() - lastCheck >= CHECK_INTERVAL)
      void check();
  }
  return {
    useStore,
    check,
    start,
    install,
    dismiss,
    open,
    prepare: load,
    async readWhatsNew() {
      await load();
      await markRead(options.installedVersionCode ?? 0);
    },
    connect,
    foreground,
    supported: native !== null,
  };
}

const releaseFeed = createReleaseFeed(AsyncStorage);
export const appUpdates = createUpdateController(
  Platform.OS === 'android' ? Updates : null,
  AsyncStorage,
  Date.now,
  { installedVersionCode, loadReleaseNotes: releaseFeed.get },
);
export const useAppUpdates = appUpdates.useStore;

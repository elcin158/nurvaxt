import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import Updates, { type PlayUpdateInfo } from '../../../modules/nurvaxt-updates/src';

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
  visible: boolean;
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

// Isolated controller keeps the native events, storage and UI on one shared state machine.
export function createUpdateController(
  native: NativeUpdates | null,
  storage: Storage = AsyncStorage,
  now = Date.now,
) {
  const useStore = create<UpdateState>(() => ({
    status: 'idle',
    versionCode: 0,
    bytesDownloaded: 0,
    totalBytes: 0,
    visible: false,
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

  function load() {
    return (loaded ??= storage
      .getItem(DISMISSAL_KEY)
      .then((raw) => {
        if (!raw) return;
        const value = JSON.parse(raw) as Partial<Dismissal> | null;
        if (value && Number.isInteger(value.versionCode) && Number.isFinite(value.until))
          dismissal = value as Dismissal;
      })
      .catch(() => {}));
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
    useStore.setState({
      status,
      versionCode: info.versionCode,
      bytesDownloaded: info.bytesDownloaded,
      totalBytes: info.totalBytes,
      visible: active || (status === 'available' && (manual || !deferred)),
      error: info.status === 'failed' ? 'Yeniləmə yüklənə bilmədi. Yenidən cəhd edin.' : null,
    });
    return status === 'idle' ? 'current' : status === 'pending' ? 'downloading' : status;
  }
  async function dismiss() {
    await load();
    const state = useStore.getState();
    useStore.setState({ visible: false, error: null });
    // Downloaded updates are offered again on the next foreground entry.
    if (state.status !== 'available') return;
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
      const result = await native.startUpdate();
      if (result === 'cancelled') await dismiss();
      else if (result === 'unavailable') await check(true);
      else {
        revision++;
        dismissal = null;
        await storage.removeItem(DISMISSAL_KEY).catch(() => {});
        const state = useStore.getState();
        if (result === 'downloaded') useStore.setState({ status: 'downloaded', visible: true });
        else if (state.status === 'available')
          useStore.setState({ status: 'pending', visible: true });
      }
    } catch {
      useStore.setState({
        error: 'Yeniləmə başlaya bilmədi. İnternet bağlantısını yoxlayıb yenidən cəhd edin.',
        visible: true,
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
      useStore.setState({ status: 'installing' });
    } catch {
      useStore.setState({
        error: 'Yeniləmə quraşdırıla bilmədi. Yenidən cəhd edin.',
        visible: true,
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
    if ((status !== 'idle' && status !== 'available') || now() - lastCheck >= CHECK_INTERVAL)
      void check();
  }
  return {
    useStore,
    check,
    start,
    install,
    dismiss,
    connect,
    foreground,
    supported: native !== null,
  };
}

export const appUpdates = createUpdateController(Platform.OS === 'android' ? Updates : null);
export const useAppUpdates = appUpdates.useStore;

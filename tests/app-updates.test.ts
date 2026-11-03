import type { PlayUpdateInfo } from '../modules/nurvaxt-updates/src';
import { createUpdateController } from '../src/features/app-updates/service';
import type { ReleaseNotes } from '../src/features/app-updates/releases';

jest.mock('../modules/nurvaxt-updates/src', () => ({ __esModule: true, default: null }));
const available: PlayUpdateInfo = {
  status: 'available',
  versionCode: 9,
  flexibleAllowed: true,
  bytesDownloaded: 0,
  totalBytes: 0,
};
let now: number;
let stored: string | null;
let listener: ((info: PlayUpdateInfo) => void) | undefined;
const storage = {
  getItem: jest.fn(async () => stored),
  setItem: jest.fn(async (_key: string, value: string) => {
    stored = value;
  }),
  removeItem: jest.fn(async () => {
    stored = null;
  }),
};
const native = {
  checkForUpdate: jest.fn(async () => available),
  startUpdate: jest.fn<Promise<'accepted' | 'cancelled' | 'downloaded' | 'unavailable'>, []>(
    async () => 'accepted',
  ),
  completeUpdate: jest.fn(async () => {}),
  addListener: jest.fn((_name: 'onStateChange', callback: (info: PlayUpdateInfo) => void) => {
    listener = callback;
    return { remove: jest.fn() };
  }),
};
const controller = () => createUpdateController(native, storage, () => now);
beforeEach(() => {
  jest.clearAllMocks();
  now = 1_000_000;
  stored = null;
  listener = undefined;
  native.checkForUpdate.mockResolvedValue(available);
  native.startUpdate.mockResolvedValue('accepted');
  native.completeUpdate.mockResolvedValue();
  storage.getItem.mockImplementation(async () => stored);
});

test('unsupported builds do not check or show an update', async () => {
  const updates = createUpdateController(null, storage, () => now);
  updates.connect()();
  expect(await updates.check()).toBe('unsupported');
  expect(native.checkForUpdate).not.toHaveBeenCalled();
  expect(updates.useStore.getState().panel).toBeNull();
});

test('new versions are offered without starting a download or install', async () => {
  const updates = controller();
  expect(await updates.check()).toBe('available');
  expect(updates.useStore.getState()).toMatchObject({ status: 'available', panel: 'update' });
  expect(native.startUpdate).not.toHaveBeenCalled();
  expect(native.completeUpdate).not.toHaveBeenCalled();
});

test('Later survives a restart for 24 hours; a manual check overrides it', async () => {
  const first = controller();
  await first.check();
  await first.dismiss();
  const restarted = controller();
  await restarted.check();
  expect(restarted.useStore.getState().panel).toBeNull();
  await restarted.check(true);
  expect(restarted.useStore.getState().panel).toBe('update');
  await restarted.dismiss();
  now += 24 * 60 * 60 * 1000;
  await restarted.check();
  expect(restarted.useStore.getState().panel).toBe('update');
});

test('deferring one version does not hide a newer release', async () => {
  const updates = controller();
  await updates.check();
  await updates.dismiss();
  native.checkForUpdate.mockResolvedValue({ ...available, versionCode: 10 });
  await updates.check();
  expect(updates.useStore.getState().panel).toBe('update');
});

test('an offline background check is silent and does not hide a downloaded update', async () => {
  const updates = controller();
  native.checkForUpdate.mockRejectedValueOnce(new Error('offline'));
  expect(await updates.check()).toBe('error');
  expect(updates.useStore.getState()).toMatchObject({
    panel: null,
    error: null,
    checking: false,
  });
  native.checkForUpdate.mockResolvedValueOnce({ ...available, status: 'downloaded' });
  await updates.check();
  native.checkForUpdate.mockRejectedValueOnce(new Error('offline'));
  await updates.check();
  expect(updates.useStore.getState()).toMatchObject({ panel: 'update', status: 'downloaded' });
});

test('Play cancellation defers the offer instead of forcing another prompt', async () => {
  const updates = controller();
  await updates.check();
  native.startUpdate.mockResolvedValue('cancelled');
  await updates.start();
  expect(updates.useStore.getState()).toMatchObject({ panel: null, busy: false });
  await updates.check();
  expect(updates.useStore.getState().panel).toBeNull();
  expect(native.completeUpdate).not.toHaveBeenCalled();
});

test('download progress and ready state recover on foreground; install requires a tap', async () => {
  const updates = controller();
  const disconnect = updates.connect();
  await updates.check();
  await updates.start();
  expect(updates.useStore.getState()).toMatchObject({ status: 'pending', panel: 'update' });
  listener!({ ...available, status: 'downloading', bytesDownloaded: 40, totalBytes: 100 });
  await Promise.resolve();
  expect(updates.useStore.getState()).toMatchObject({
    status: 'downloading',
    bytesDownloaded: 40,
    totalBytes: 100,
  });
  native.checkForUpdate.mockResolvedValue({ ...available, status: 'downloaded' });
  updates.foreground();
  await updates.check();
  expect(updates.useStore.getState()).toMatchObject({ status: 'downloaded', panel: 'update' });
  expect(native.completeUpdate).not.toHaveBeenCalled();
  await updates.dismiss();
  expect(updates.useStore.getState().panel).toBeNull();
  updates.foreground();
  await updates.check();
  expect(updates.useStore.getState().panel).toBe('update');
  await updates.install();
  expect(native.completeUpdate).toHaveBeenCalledTimes(1);
  expect(updates.useStore.getState().status).toBe('installing');
  disconnect();
});

test('failed download and install allow retries without falsely reporting success', async () => {
  const updates = controller();
  updates.connect();
  await updates.check();
  listener!({ ...available, status: 'failed' });
  await Promise.resolve();
  expect(updates.useStore.getState()).toMatchObject({
    status: 'available',
    panel: 'update',
    error: expect.any(String),
  });
  native.checkForUpdate.mockResolvedValue({ ...available, status: 'downloaded' });
  await updates.check();
  native.completeUpdate.mockRejectedValueOnce(new Error('not enough space'));
  await updates.install();
  expect(updates.useStore.getState()).toMatchObject({
    status: 'downloaded',
    panel: 'update',
    busy: false,
    error: expect.any(String),
  });
  await updates.install();
  expect(updates.useStore.getState().status).toBe('installing');
});

test('an older availability response cannot overwrite a new download event', async () => {
  const updates = controller();
  updates.connect();
  await updates.check();
  let resolve!: (info: PlayUpdateInfo) => void;
  native.checkForUpdate.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const check = updates.check();
  await Promise.resolve();
  listener!({ ...available, status: 'downloaded' });
  await Promise.resolve();
  resolve(available);
  await check;
  expect(updates.useStore.getState()).toMatchObject({ status: 'downloaded', panel: 'update' });
});

test('a ready event during consent is not overwritten by the accepted result', async () => {
  const updates = controller();
  updates.connect();
  await updates.check();
  let accept!: (value: 'accepted') => void;
  native.startUpdate.mockImplementationOnce(
    () =>
      new Promise((done) => {
        accept = done;
      }),
  );
  const start = updates.start();
  listener!({ ...available, status: 'downloaded' });
  await Promise.resolve();
  accept('accepted');
  await start;
  expect(updates.useStore.getState().status).toBe('downloaded');
});

test('an installed event during completion removes the badge and is not overwritten', async () => {
  const updates = controller();
  native.checkForUpdate.mockResolvedValue({ ...available, status: 'downloaded' });
  updates.connect();
  await updates.check();
  native.completeUpdate.mockImplementationOnce(async () => {
    listener!({ ...available, status: 'installed' });
  });
  await updates.install();
  expect(updates.useStore.getState()).toMatchObject({ status: 'idle', panel: null });
});

test('corrupt dismissal storage cannot prevent checking for updates', async () => {
  stored = 'invalid json';
  const updates = controller();
  expect(await updates.check()).toBe('available');
  expect(updates.useStore.getState().panel).toBe('update');
});

test('foreground checks are throttled when no download is in progress', async () => {
  const updates = controller();
  await updates.check();
  updates.foreground();
  expect(native.checkForUpdate).toHaveBeenCalledTimes(1);
  now += 15 * 60 * 1000;
  updates.foreground();
  await updates.check();
  expect(native.checkForUpdate).toHaveBeenCalledTimes(2);
});

test('Later hides the panel but preserves availability and the badge can reopen it', async () => {
  const updates = controller();
  await updates.check();
  await updates.dismiss();
  expect(updates.useStore.getState()).toMatchObject({ status: 'available', panel: null });
  const checks = native.checkForUpdate.mock.calls.length;
  updates.open();
  expect(updates.useStore.getState().panel).toBe('update');
  expect(native.checkForUpdate).toHaveBeenCalledTimes(checks);
  expect(native.startUpdate).not.toHaveBeenCalled();
  await updates.check();
  expect(updates.useStore.getState().panel).toBe('update');
});

test('a late availability response cannot undo an explicit Later action', async () => {
  const updates = controller();
  await updates.check();
  let resolve!: (info: PlayUpdateInfo) => void;
  native.checkForUpdate.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const check = updates.check();
  await Promise.resolve();
  const dismiss = updates.dismiss();
  resolve(available);
  await Promise.all([check, dismiss]);
  expect(updates.useStore.getState()).toMatchObject({ status: 'available', panel: null });
});

test('background download events do not reopen a dismissed panel, including completion', async () => {
  const updates = controller();
  updates.connect();
  await updates.check();
  await updates.start();
  await updates.dismiss();
  listener!({ ...available, status: 'downloading', bytesDownloaded: 40, totalBytes: 100 });
  await Promise.resolve();
  expect(updates.useStore.getState()).toMatchObject({ status: 'downloading', panel: null });
  listener!({ ...available, status: 'downloaded', bytesDownloaded: 100, totalBytes: 100 });
  await Promise.resolve();
  expect(updates.useStore.getState()).toMatchObject({ status: 'downloaded', panel: null });
  expect(native.completeUpdate).not.toHaveBeenCalled();
  native.checkForUpdate.mockResolvedValue({ ...available, status: 'downloaded' });
  updates.foreground();
  await updates.check();
  expect(updates.useStore.getState()).toMatchObject({ status: 'downloaded', panel: 'update' });
});

test('a confirmed unavailable update removes the persistent badge state', async () => {
  const updates = controller();
  await updates.check();
  await updates.dismiss();
  native.checkForUpdate.mockResolvedValue({
    ...available,
    status: 'unavailable',
    flexibleAllowed: false,
  });
  await updates.check();
  expect(updates.useStore.getState()).toMatchObject({ status: 'idle', panel: null });
});

test('an automatic important update introduces itself once, even when Play has no newer build', async () => {
  const values = new Map<string, string>([
    [
      'nurvaxt-release-history',
      JSON.stringify({ installedVersionCode: 15, seenVersionCode: 15, pendingVersionCode: null }),
    ],
  ]);
  const trackedStorage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
  const release = {
    versionCode: 16,
    version: '1.0.13',
    date: '2026-10-22',
    important: true,
    items: [],
  };
  native.checkForUpdate.mockResolvedValue({ ...available, status: 'unavailable' });
  const options = { installedVersionCode: 16, releases: [release] };
  const updates = createUpdateController(native, trackedStorage, () => now, options);
  await updates.check();
  expect(updates.useStore.getState()).toMatchObject({
    status: 'idle',
    panel: 'whats-new',
    announcement: release,
  });
  await updates.dismiss();
  const restarted = createUpdateController(native, trackedStorage, () => now, options);
  await restarted.check();
  expect(restarted.useStore.getState()).toMatchObject({ panel: null, announcement: null });
});

const futureRelease: ReleaseNotes = {
  versionCode: 99,
  version: '2.0.0',
  date: '2026-11-03',
  important: true,
  items: [{ icon: 'sparkles-outline', title: 'Yeni imkan', description: 'İmkanın izahı.' }],
};

test('future release text loads independently without delaying the Play update offer', async () => {
  let resolveNotes!: (release: ReleaseNotes) => void;
  const loadReleaseNotes = jest.fn(
    () => new Promise<ReleaseNotes>((resolve) => (resolveNotes = resolve)),
  );
  native.checkForUpdate.mockResolvedValue({ ...available, versionCode: 99 });
  const updates = createUpdateController(native, storage, () => now, { loadReleaseNotes });
  expect(await updates.check()).toBe('available');
  expect(updates.useStore.getState()).toMatchObject({
    panel: 'update',
    status: 'available',
    notesLoading: true,
    release: null,
  });
  expect(loadReleaseNotes).toHaveBeenCalledWith(99, false);
  await updates.start();
  expect(native.startUpdate).toHaveBeenCalledTimes(1);
  resolveNotes(futureRelease);
  await Promise.resolve();
  expect(updates.useStore.getState()).toMatchObject({
    status: 'pending',
    release: futureRelease,
    notesLoading: false,
  });
});

test('bundled notes, unsupported builds and unavailable updates need no feed request', async () => {
  const loadReleaseNotes = jest.fn(async () => futureRelease);
  const unsupported = createUpdateController(null, storage, () => now, { loadReleaseNotes });
  await unsupported.check();
  native.checkForUpdate.mockResolvedValueOnce({ ...available, status: 'unavailable' });
  const updates = createUpdateController(native, storage, () => now, { loadReleaseNotes });
  await updates.check();
  native.checkForUpdate.mockResolvedValueOnce({ ...available, versionCode: 14 });
  await updates.check();
  expect(updates.useStore.getState().release?.version).toBe('1.0.11');
  expect(loadReleaseNotes).not.toHaveBeenCalled();
});

test('failed notes can be retried manually without preventing an update', async () => {
  const loadReleaseNotes = jest.fn<Promise<ReleaseNotes | undefined>, [number, boolean]>(
    async () => undefined,
  );
  loadReleaseNotes.mockRejectedValueOnce(new Error('offline'));
  native.checkForUpdate.mockResolvedValue({ ...available, versionCode: 99 });
  const updates = createUpdateController(native, storage, () => now, { loadReleaseNotes });
  expect(await updates.check()).toBe('available');
  await Promise.resolve();
  expect(updates.useStore.getState()).toMatchObject({ release: null, notesLoading: false });
  loadReleaseNotes.mockResolvedValueOnce(futureRelease);
  await updates.check(true);
  await Promise.resolve();
  expect(loadReleaseNotes).toHaveBeenLastCalledWith(99, true);
  expect(updates.useStore.getState().release).toEqual(futureRelease);
});

test('notes for another build are ignored and late responses never reopen a dismissed panel', async () => {
  let resolveNotes!: (release: ReleaseNotes) => void;
  const loadReleaseNotes = jest.fn(
    () => new Promise<ReleaseNotes>((resolve) => (resolveNotes = resolve)),
  );
  native.checkForUpdate.mockResolvedValue({ ...available, versionCode: 99 });
  const updates = createUpdateController(native, storage, () => now, { loadReleaseNotes });
  await updates.check();
  await updates.check();
  expect(loadReleaseNotes).toHaveBeenCalledTimes(1);
  await updates.dismiss();
  resolveNotes({ ...futureRelease, versionCode: 100 });
  await Promise.resolve();
  expect(updates.useStore.getState()).toMatchObject({ panel: null, release: null });
});

test('an old metadata request cannot replace notes for a newer offered build', async () => {
  const resolvers = new Map<number, (release: ReleaseNotes) => void>();
  const loadReleaseNotes = (code: number) =>
    new Promise<ReleaseNotes>((resolve) => resolvers.set(code, resolve));
  const updates = createUpdateController(native, storage, () => now, { loadReleaseNotes });
  native.checkForUpdate.mockResolvedValueOnce({ ...available, versionCode: 99 });
  await updates.check();
  native.checkForUpdate.mockResolvedValueOnce({ ...available, versionCode: 100 });
  await updates.check();
  resolvers.get(99)!(futureRelease);
  await Promise.resolve();
  expect(updates.useStore.getState()).toMatchObject({
    versionCode: 100,
    release: null,
    notesLoading: true,
  });
  resolvers.get(100)!({ ...futureRelease, versionCode: 100, version: '2.0.1' });
  await Promise.resolve();
  expect(updates.useStore.getState().release?.version).toBe('2.0.1');
});

test('metadata arriving after Play withdraws an update cannot restore it', async () => {
  let resolveNotes!: (release: ReleaseNotes) => void;
  const loadReleaseNotes = () => new Promise<ReleaseNotes>((resolve) => (resolveNotes = resolve));
  const updates = createUpdateController(native, storage, () => now, { loadReleaseNotes });
  native.checkForUpdate.mockResolvedValueOnce({ ...available, versionCode: 99 });
  await updates.check();
  native.checkForUpdate.mockResolvedValueOnce({
    ...available,
    versionCode: 99,
    status: 'unavailable',
  });
  await updates.check();
  resolveNotes(futureRelease);
  await Promise.resolve();
  expect(updates.useStore.getState()).toMatchObject({
    status: 'idle',
    panel: null,
    release: null,
    notesLoading: false,
  });
});

test('remote notes read before updating do not repeat as a post-install announcement', async () => {
  const values = new Map<string, string>();
  const trackedStorage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
  native.checkForUpdate.mockResolvedValue({ ...available, versionCode: 99 });
  const updates = createUpdateController(native, trackedStorage, () => now, {
    installedVersionCode: 16,
    loadReleaseNotes: async () => futureRelease,
  });
  await updates.check();
  await Promise.resolve();
  await updates.dismiss();
  const restarted = createUpdateController(null, trackedStorage, () => now, {
    installedVersionCode: 99,
    releases: [futureRelease],
  });
  await restarted.prepare();
  expect(restarted.useStore.getState()).toMatchObject({ announcement: null, panel: null });
});

import type { PlayUpdateInfo } from '../modules/nurvaxt-updates/src';
import { createUpdateController } from '../src/features/app-updates/service';

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
  expect(updates.useStore.getState().visible).toBe(false);
});

test('new versions are offered without starting a download or install', async () => {
  const updates = controller();
  expect(await updates.check()).toBe('available');
  expect(updates.useStore.getState()).toMatchObject({ status: 'available', visible: true });
  expect(native.startUpdate).not.toHaveBeenCalled();
  expect(native.completeUpdate).not.toHaveBeenCalled();
});

test('Later survives a restart for 24 hours; a manual check overrides it', async () => {
  const first = controller();
  await first.check();
  await first.dismiss();
  const restarted = controller();
  await restarted.check();
  expect(restarted.useStore.getState().visible).toBe(false);
  await restarted.check(true);
  expect(restarted.useStore.getState().visible).toBe(true);
  await restarted.dismiss();
  now += 24 * 60 * 60 * 1000;
  await restarted.check();
  expect(restarted.useStore.getState().visible).toBe(true);
});

test('deferring one version does not hide a newer release', async () => {
  const updates = controller();
  await updates.check();
  await updates.dismiss();
  native.checkForUpdate.mockResolvedValue({ ...available, versionCode: 10 });
  await updates.check();
  expect(updates.useStore.getState().visible).toBe(true);
});

test('an offline background check is silent and does not hide a downloaded update', async () => {
  const updates = controller();
  native.checkForUpdate.mockRejectedValueOnce(new Error('offline'));
  expect(await updates.check()).toBe('error');
  expect(updates.useStore.getState()).toMatchObject({
    visible: false,
    error: null,
    checking: false,
  });
  native.checkForUpdate.mockResolvedValueOnce({ ...available, status: 'downloaded' });
  await updates.check();
  native.checkForUpdate.mockRejectedValueOnce(new Error('offline'));
  await updates.check();
  expect(updates.useStore.getState()).toMatchObject({ visible: true, status: 'downloaded' });
});

test('Play cancellation defers the offer instead of forcing another prompt', async () => {
  const updates = controller();
  await updates.check();
  native.startUpdate.mockResolvedValue('cancelled');
  await updates.start();
  expect(updates.useStore.getState()).toMatchObject({ visible: false, busy: false });
  await updates.check();
  expect(updates.useStore.getState().visible).toBe(false);
  expect(native.completeUpdate).not.toHaveBeenCalled();
});

test('download progress and ready state recover on foreground; install requires a tap', async () => {
  const updates = controller();
  const disconnect = updates.connect();
  await updates.check();
  await updates.start();
  expect(updates.useStore.getState()).toMatchObject({ status: 'pending', visible: true });
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
  expect(updates.useStore.getState()).toMatchObject({ status: 'downloaded', visible: true });
  expect(native.completeUpdate).not.toHaveBeenCalled();
  await updates.dismiss();
  expect(updates.useStore.getState().visible).toBe(false);
  updates.foreground();
  await updates.check();
  expect(updates.useStore.getState().visible).toBe(true);
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
    visible: true,
    error: expect.any(String),
  });
  native.checkForUpdate.mockResolvedValue({ ...available, status: 'downloaded' });
  await updates.check();
  native.completeUpdate.mockRejectedValueOnce(new Error('not enough space'));
  await updates.install();
  expect(updates.useStore.getState()).toMatchObject({
    status: 'downloaded',
    visible: true,
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
  expect(updates.useStore.getState()).toMatchObject({ status: 'downloaded', visible: true });
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

test('corrupt dismissal storage cannot prevent checking for updates', async () => {
  stored = 'invalid json';
  const updates = controller();
  expect(await updates.check()).toBe('available');
  expect(updates.useStore.getState().visible).toBe(true);
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

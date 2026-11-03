import {
  createReleaseFeed,
  RELEASE_FEED_URL,
  releaseFeedSchema,
} from '../src/features/app-updates/release-feed';
import type { ReleaseNotes } from '../src/features/app-updates/releases';

const release: ReleaseNotes = {
  versionCode: 99,
  version: '2.0.0',
  date: '2026-11-03',
  important: true,
  items: [{ icon: 'sparkles-outline', title: 'Yeni imkan', description: 'Yeni imkanın izahı.' }],
};
const feed = { schemaVersion: 1, packageName: 'az.nurvaxt.app', releases: [release] };
let values: Map<string, string>;
let now: number;
const storage = {
  getItem: jest.fn(async (key: string) => values.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    values.set(key, value);
  }),
};
const fetchFeed = jest.fn(async () => ({ ok: true, text: async () => JSON.stringify(feed) }));
const source = () => createReleaseFeed(storage, fetchFeed, () => now);
beforeEach(() => {
  jest.clearAllMocks();
  values = new Map();
  now = 1_000_000;
  fetchFeed.mockResolvedValue({ ok: true, text: async () => JSON.stringify(feed) });
});
afterEach(() => jest.useRealTimers());

test('only the exact offered build is returned, using the public GitHub feed without credentials', async () => {
  const notes = source();
  expect(await notes.get(99)).toEqual(release);
  expect(await notes.get(98)).toBeUndefined();
  expect(fetchFeed).toHaveBeenCalledTimes(2);
  expect(fetchFeed).toHaveBeenCalledWith(RELEASE_FEED_URL, {
    signal: expect.any(AbortSignal),
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
  });
});

test('a validated feed survives restart and is refreshed after its cache expires', async () => {
  expect(await source().get(99)).toEqual(release);
  expect(await source().get(99)).toEqual(release);
  expect(fetchFeed).toHaveBeenCalledTimes(1);
  now += 15 * 60 * 1000;
  await source().get(99);
  expect(fetchFeed).toHaveBeenCalledTimes(2);
});

test.each(['memory', 'persisted'])(
  'a newly offered build missing from a fresh %s cache is fetched immediately',
  async (cache) => {
    const previousRelease = { ...release, versionCode: 98, version: '1.9.0' };
    const previousFeed = { ...feed, releases: [previousRelease] };
    if (cache === 'persisted') {
      values.set('nurvaxt-release-feed-v1', JSON.stringify({ fetchedAt: now, feed: previousFeed }));
    }
    const notes = source();
    if (cache === 'memory') {
      fetchFeed.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(previousFeed) });
      expect(await notes.get(98)).toEqual(previousRelease);
    }
    now += 1000;
    expect(await notes.get(99)).toEqual(release);
    expect(fetchFeed).toHaveBeenCalledTimes(cache === 'memory' ? 2 : 1);
  },
);

test('notes missing from a successful response can be retried after a minute without waiting for the cache to expire', async () => {
  const notes = source();
  fetchFeed.mockResolvedValueOnce({
    ok: true,
    text: async () => JSON.stringify({ ...feed, releases: [] }),
  });
  expect(await notes.get(99)).toBeUndefined();
  now += 59_000;
  expect(await notes.get(99)).toBeUndefined();
  expect(fetchFeed).toHaveBeenCalledTimes(1);
  now += 1000;
  expect(await notes.get(99)).toEqual(release);
  expect(fetchFeed).toHaveBeenCalledTimes(2);
});

test('a manual request can discover notes published after a cached response', async () => {
  const notes = source();
  fetchFeed.mockResolvedValueOnce({
    ok: true,
    text: async () => JSON.stringify({ ...feed, releases: [] }),
  });
  expect(await notes.get(99)).toBeUndefined();
  expect(await notes.get(99, true)).toEqual(release);
  expect(fetchFeed).toHaveBeenCalledTimes(2);
});

test('offline and malformed responses retain previously validated notes', async () => {
  const notes = source();
  await notes.get(99);
  now += 15 * 60 * 1000;
  fetchFeed.mockRejectedValueOnce(new Error('offline'));
  expect(await notes.get(99)).toEqual(release);
  now += 60 * 1000;
  fetchFeed.mockResolvedValueOnce({ ok: true, text: async () => '{invalid json' });
  expect(await notes.get(99)).toEqual(release);
  expect(await source().get(99)).toEqual(release);
});

test.each([
  { ...feed, packageName: 'other.app' },
  { ...feed, schemaVersion: 2 },
  { ...feed, releases: [release, release] },
  { ...feed, releases: [{ ...release, versionCode: 1.5 }] },
  { ...feed, releases: [{ ...release, items: [] }] },
  {
    ...feed,
    releases: [{ ...release, items: [{ ...release.items[0], icon: 'invalid-icon' }] }],
  },
])('invalid release metadata cannot be displayed or cached: %j', async (invalid) => {
  fetchFeed.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(invalid) });
  expect(releaseFeedSchema.safeParse(invalid).success).toBe(false);
  expect(await source().get(99)).toBeUndefined();
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('missing files and oversized responses fail quietly and allow a later retry', async () => {
  const notes = source();
  fetchFeed.mockResolvedValueOnce({ ok: false, text: async () => 'Not Found' });
  expect(await notes.get(99)).toBeUndefined();
  expect(await notes.get(99)).toBeUndefined();
  expect(fetchFeed).toHaveBeenCalledTimes(1);
  now += 60 * 1000;
  fetchFeed.mockResolvedValueOnce({ ok: true, text: async () => ' '.repeat(256 * 1024 + 1) });
  expect(await notes.get(99)).toBeUndefined();
  now += 60 * 1000;
  expect(await notes.get(99)).toEqual(release);
});

test('concurrent lookups share one request and match their own version codes', async () => {
  const notes = source();
  expect(await Promise.all([notes.get(99), notes.get(98), notes.get(99)])).toEqual([
    release,
    undefined,
    release,
  ]);
  expect(fetchFeed).toHaveBeenCalledTimes(1);
});

test('a stalled response times out even if the fetch implementation ignores abort', async () => {
  jest.useFakeTimers();
  fetchFeed.mockImplementationOnce(() => new Promise(() => {}));
  const pending = source().get(99);
  await jest.advanceTimersByTimeAsync(5000);
  expect(await pending).toBeUndefined();
  const options = (fetchFeed.mock.calls[0] as unknown as [string, RequestInit])[1];
  expect(options.signal?.aborted).toBe(true);
});

test('corrupt cache and failed persistence do not block valid notes', async () => {
  storage.getItem.mockResolvedValueOnce('{bad json');
  storage.setItem.mockRejectedValueOnce(new Error('storage full'));
  expect(await source().get(99)).toEqual(release);
});

test('invalid offered version codes do not access storage or the network', async () => {
  const notes = source();
  for (const code of [0, -1, 1.5, NaN]) expect(await notes.get(code)).toBeUndefined();
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(fetchFeed).not.toHaveBeenCalled();
});

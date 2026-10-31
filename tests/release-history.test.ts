import { createReleaseHistory } from '../src/features/app-updates/release-history';
import { releaseHistory, type ReleaseNotes } from '../src/features/app-updates/releases';

const releases: readonly ReleaseNotes[] = [
  { versionCode: 16, version: '1.0.13', date: '2026-10-22', important: false, items: [] },
  {
    versionCode: 17,
    version: '1.0.14',
    date: '2026-10-31',
    important: true,
    items: [{ icon: 'sparkles-outline', title: 'Yeni imkan', description: 'Yeni imkanın izahı.' }],
  },
  { versionCode: 18, version: '1.0.15', date: '2026-11-01', important: false, items: [] },
];
let values: Map<string, string>;
const storage = {
  getItem: jest.fn(async (key: string) => values.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    values.set(key, value);
  }),
};
const history = (code: number) => createReleaseHistory(storage, code, releases);
beforeEach(() => {
  values = new Map();
  jest.clearAllMocks();
});

test('first installation establishes a baseline without replaying release notes', async () => {
  expect(await history(17).load()).toBeUndefined();
  expect(await history(17).load()).toBeUndefined();
});

test('migration introduces an important current release once for an existing user', async () => {
  const migrated = history(17);
  expect((await migrated.load(true))?.versionCode).toBe(17);
  await migrated.markRead(17);
  expect(await history(17).load(true)).toBeUndefined();
});

test('finishing onboarding does not turn a fresh install into a migrated update', async () => {
  const fresh = history(17);
  expect(await fresh.load(false)).toBeUndefined();
  expect(await fresh.load(true)).toBeUndefined();
});

test('an important installed update stays pending across restarts until read, then never repeats', async () => {
  await history(16).load();
  expect((await history(17).load())?.versionCode).toBe(17);
  const restarted = history(17);
  expect((await restarted.load())?.versionCode).toBe(17);
  await restarted.markRead(17);
  expect(await history(17).load()).toBeUndefined();
});

test('notes already read before installation do not reappear after updating', async () => {
  const previous = history(16);
  await previous.load();
  await previous.markRead(17);
  expect(await history(17).load()).toBeUndefined();
});

test('small fixes do not interrupt the user with a post-install panel', async () => {
  await history(17).load();
  expect(await history(18).load()).toBeUndefined();
});

test('unknown builds and downgrades do not invent an announcement', async () => {
  await history(16).load();
  expect(await history(20).load()).toBeUndefined();
  expect(await history(17).load()).toBeUndefined();
});

test('corrupt tracking is recovered as a baseline', async () => {
  values.set('nurvaxt-release-history', '{bad json');
  expect(await history(17).load()).toBeUndefined();
  expect(await history(17).load()).toBeUndefined();
});

test('history never lists notes for a build that is not installed yet', () => {
  expect(releaseHistory(17, releases).map((release) => release.versionCode)).toEqual([17, 16]);
  expect(releases.map((release) => release.versionCode)).toEqual([16, 17, 18]);
});

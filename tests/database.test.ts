import { spawnSync } from 'node:child_process';
import dataset from '../data/verified/2026.json';
import { PRAYER_DB_BUNDLE } from '../src/database/bundled';
const mockState = { bundle: undefined as string | undefined, count: dataset.records.length };
const mockImport = jest.fn(async () => {
  mockState.bundle = PRAYER_DB_BUNDLE;
  mockState.count = dataset.records.length;
});
const mockDelete = jest.fn(async () => {});
const mockDb = {
  closeAsync: jest.fn(async () => {}),
  getFirstAsync: jest.fn(async (sql: string) => {
    if (sql.includes("key = 'bundle'"))
      return mockState.bundle ? { value: mockState.bundle } : null;
    if (sql === 'PRAGMA quick_check') return { quick_check: 'ok' };
    if (sql === 'PRAGMA user_version') return { user_version: 1 };
    if (sql.startsWith('SELECT count(*)')) return { count: mockState.count };
    return null;
  }),
  getAllAsync: jest.fn(async () => []),
};
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: async () => mockDb,
  importDatabaseFromAssetAsync: mockImport,
  deleteDatabaseAsync: mockDelete,
}));
jest.mock('../data/verified/prayer-times.db', () => 1, { virtual: true });
function load() {
  let repository!: typeof import('../src/database/repository');
  jest.isolateModules(() => {
    repository = require('../src/database/repository');
  });
  return repository;
}
beforeEach(() => {
  mockImport.mockClear();
  mockDelete.mockClear();
});
test('first launch copies the asset database and removes the legacy copy', async () => {
  mockState.bundle = undefined;
  await load().getDatabase();
  expect(mockImport).toHaveBeenCalledTimes(1);
  expect(mockImport).toHaveBeenCalledWith('prayer-times.db', {
    assetId: expect.anything(),
    forceOverwrite: true,
  });
  expect(mockDelete).toHaveBeenCalledWith('nurvaxt.db');
  expect(mockDelete).toHaveBeenCalledWith('nurvaxt.db-wal');
  expect(mockDelete).toHaveBeenCalledWith('nurvaxt.db-shm');
});
test('matching bundle opens the installed copy without copying', async () => {
  mockState.bundle = PRAYER_DB_BUNDLE;
  await load().getDatabase();
  expect(mockImport).not.toHaveBeenCalled();
});
test('an app update with a different bundle replaces the installed copy', async () => {
  mockState.bundle = 'previous-bundle';
  await load().getDatabase();
  expect(mockImport).toHaveBeenCalledTimes(1);
});
test('an incomplete installed copy is replaced', async () => {
  mockState.bundle = PRAYER_DB_BUNDLE;
  mockState.count = 10;
  await load().getDatabase();
  expect(mockImport).toHaveBeenCalledTimes(1);
});
test('a failed install rejects so startup can show the retry screen', async () => {
  mockState.bundle = undefined;
  mockImport.mockImplementationOnce(async () => {});
  await expect(load().getDatabase()).rejects.toThrow('quraşdırılmadı');
});
test('shipped SQLite integrity, bundle id, coverage and indexed city/date lookup', () => {
  const result = spawnSync(
    'python3',
    [
      '-c',
      `import sqlite3\nc=sqlite3.connect('data/verified/prayer-times.db')\nassert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok'\nassert c.execute('PRAGMA user_version').fetchone()[0]==1\nassert c.execute('PRAGMA journal_mode').fetchone()[0]=='delete'\nassert c.execute("SELECT value FROM metadata WHERE key='bundle'").fetchone()[0]=='${PRAYER_DB_BUNDLE}'\nassert c.execute('SELECT count(*) FROM prayer_days').fetchone()[0]==${dataset.records.length}\nassert c.execute("SELECT asr FROM prayer_days WHERE locationId='qmi-1' AND date='2026-10-08'").fetchone()[0]=='16:27'\nassert c.execute("SELECT fajr FROM prayer_days WHERE locationId='qmi-1' AND date='2026-11-01'").fetchone()[0]=='05:49'\nassert c.execute("SELECT fajr FROM prayer_days WHERE locationId='qmi-1' AND date='2026-12-01'").fetchone()[0]=='06:19'\nassert c.execute("SELECT midnight FROM prayer_days WHERE locationId='qmi-1' AND date='2026-12-31'").fetchone()[0]=='00:00'\nassert c.execute("SELECT count(*) FROM prayer_days WHERE date >= '2027-01-01'").fetchone()[0]==0\nassert 'INDEX' in c.execute("EXPLAIN QUERY PLAN SELECT * FROM prayer_days WHERE locationId='qmi-1' AND date BETWEEN '2026-10-01' AND '2026-12-31'").fetchone()[3]\n`,
    ],
    { encoding: 'utf8' },
  );
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
});

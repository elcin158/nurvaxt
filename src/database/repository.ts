import * as SQLite from 'expo-sqlite';
import type { Dataset, PrayerDay } from '../types/data';
import { bundledDatasets, PRAYER_DB_BUNDLE, prayerDatabase } from './bundled';
const DB_NAME = 'prayer-times.db';
// Writable copy populated from JSON by app versions before 1.0.5.
const LEGACY_DB_NAME = 'nurvaxt.db';
let database: Promise<SQLite.SQLiteDatabase> | undefined;
const columns =
  'date, locationId, imsak, fajr, sunrise, dhuhr, asr, sunset, maghrib, isha, midnight, sourceId, sourceVersion, verified';
async function installedBundle(db: SQLite.SQLiteDatabase) {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM metadata WHERE key = 'bundle'",
    );
    return row?.value;
  } catch {
    return undefined;
  }
}
async function verify(db: SQLite.SQLiteDatabase) {
  const integrity = await db.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
  if (integrity?.quick_check !== 'ok') throw new Error('Verilənlər bazasının bütövlüyü pozulub.');
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (version?.user_version !== 1) throw new Error('Verilənlər bazası versiyası dəstəklənmir.');
  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT count(*) AS count FROM prayer_days',
  );
  const expected = bundledDatasets.reduce((sum, data) => sum + data.recordCount, 0);
  if (count?.count !== expected) throw new Error('Təqvim natamamdır.');
}
async function install() {
  await SQLite.importDatabaseFromAssetAsync(DB_NAME, {
    assetId: prayerDatabase,
    forceOverwrite: true,
  });
  // deleteDatabaseAsync removes only the named file, so clear the legacy WAL files explicitly.
  for (const suffix of ['', '-wal', '-shm'])
    await SQLite.deleteDatabaseAsync(LEGACY_DB_NAME + suffix).catch(() => {});
}
// The database ships prebuilt as an app asset. It is copied on first launch and replaced
// whenever an app update carries a different bundle or the copy fails verification.
// The app never writes to it.
export function getDatabase() {
  database ??= (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      if ((await installedBundle(db)) === PRAYER_DB_BUNDLE) {
        try {
          await verify(db);
          return db;
        } catch {}
      }
      await db.closeAsync();
    } catch {}
    await install();
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    if ((await installedBundle(db)) !== PRAYER_DB_BUNDLE)
      throw new Error('Təqvim paketi quraşdırılmadı.');
    await verify(db);
    return db;
  })().catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}
function normalize(row: PrayerDay) {
  return { ...row, verified: Boolean(row.verified) };
}
export async function readDays(
  locationId: string,
  start: string,
  end: string,
): Promise<PrayerDay[]> {
  const db = await getDatabase();
  return (
    await db.getAllAsync<PrayerDay>(
      `SELECT ${columns} FROM prayer_days WHERE locationId = ? AND date BETWEEN ? AND ? AND verified = 1 ORDER BY date`,
      locationId,
      start,
      end,
    )
  ).map(normalize);
}
export async function readMetadata(year: number): Promise<Omit<Dataset, 'records'> | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM metadata WHERE key = ?',
    `dataset:${year}`,
  );
  return row ? JSON.parse(row.value) : null;
}

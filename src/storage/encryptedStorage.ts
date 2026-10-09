import * as SQLite from 'expo-sqlite';
import { openDatabaseAsync } from './sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { open as openEnvelope, seal } from './cipher';
import type { Envelope } from './envelope';

/** Records of one user, each stored under its own key. Every write is one durable, atomic statement. */
export interface LocalStorage {
  read(owner: string, key: string): string | null;
  write(owner: string, key: string, value: string): void;
  list(owner: string): string[];
  remove(owner: string, key: string): void;
}
/** Where one module keeps its records: an SQLite file and table, and the keychain entry of its key. */
export type StorageLocation = { file: string; table: string; keychainService: string; secretPrefix: string };

const databases = new Map<string, Promise<SQLite.SQLiteDatabase>>();
function database({ file, table }: StorageLocation) {
  let db = databases.get(file);
  if (!db) databases.set(file, db = openDatabaseAsync(file).then(async value => {
    await value.execAsync(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS ${table} (owner TEXT NOT NULL, key TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY (owner, key));`);
    return value;
  }).catch(cause => { databases.delete(file); throw cause; }));
  return db;
}

/** Deletes one record key for every owner and returns the freed space to the file system. */
export async function purgeKey(location: StorageLocation, key: string) {
  const db = await database(location);
  const { changes } = await db.runAsync(`DELETE FROM ${location.table} WHERE key = ?`, key);
  if (changes) await db.execAsync('VACUUM;');
  // VACUUM writes through the WAL; the checkpoint moves it into the file and empties the WAL.
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

/**
 * Opens one owner's records, encrypted with AES-256-GCM under a per-owner key kept in the
 * keychain. Each record's key and owner are authenticated with it, so records cannot be swapped.
 */
export async function openEncryptedStorage(location: StorageLocation, owner: string): Promise<LocalStorage> {
  const db = await database(location), { table } = location;
  const secretName = `${location.secretPrefix}.${owner}`;
  const options = { keychainService: location.keychainService, keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
  let keyHex = await SecureStore.getItemAsync(secretName, options);
  if (!keyHex) {
    const existing = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table} WHERE owner = ?`, owner);
    if (existing?.count) throw new Error('Lokal məlumatların açarı tapılmadı. Mövcud qeydlər saxlanıldı.');
    keyHex = bytesToHex(Crypto.getRandomBytes(32));
    await SecureStore.setItemAsync(secretName, keyHex, options);
  }
  const key = hexToBytes(keyHex);
  const aad = (recordKey: string) => `${owner}:${recordKey}`;
  const write = (account: string, recordKey: string, value: string) => {
    const envelope = seal(key, Crypto.getRandomBytes(12), aad(recordKey), value);
    db.runSync(`INSERT INTO ${table} (owner, key, payload) VALUES (?, ?, ?) ON CONFLICT(owner, key) DO UPDATE SET payload = excluded.payload`,
      account, recordKey, JSON.stringify(envelope));
  };
  const open = (account: string, payload: string, recordKey: string) => {
    const envelope = JSON.parse(payload) as Envelope, value = openEnvelope(key, aad(recordKey), envelope);
    // Records written before v2 are rewritten once, so later opens read the smaller format.
    if (envelope.v !== 2) write(account, recordKey, value);
    return value;
  };
  return {
    read: (account, recordKey) => {
      const row = db.getFirstSync<{ payload: string }>(`SELECT payload FROM ${table} WHERE owner = ? AND key = ?`, account, recordKey);
      return row ? open(account, row.payload, recordKey) : null;
    },
    write,
    remove: (account, recordKey) => { db.runSync(`DELETE FROM ${table} WHERE owner = ? AND key = ?`, account, recordKey); },
    list: account => db.getAllSync<{ key: string; payload: string }>(
      `SELECT key, payload FROM ${table} WHERE owner = ? AND key LIKE 'draft:%'`, account)
      .map(row => open(account, row.payload, row.key)),
  };
}

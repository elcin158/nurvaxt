import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { open as openEnvelope, seal } from './cipher';
import type { Envelope } from './envelope';
import { ResidentStore, type LocalStorage } from './store';

const database = SQLite.openDatabaseAsync('evtas-residents.db').then(async db => {
  await db.execAsync(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS resident_local (owner TEXT NOT NULL, key TEXT NOT NULL, payload TEXT NOT NULL,
      PRIMARY KEY (owner, key));`);
  return db;
});

const opening = new Map<string, Promise<ResidentStore>>();
export function openResidentStore(owner: string): Promise<ResidentStore> {
  const existing = opening.get(owner);
  if (existing) return existing;
  const promise = initializeStore(owner).finally(() => { opening.delete(owner); });
  opening.set(owner, promise);
  return promise;
}
async function initializeStore(owner: string): Promise<ResidentStore> {
  const db = await database;
  const secretName = `evtas.residents.${owner}`;
  const options = { keychainService: 'evtas.residents.v1', keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
  let keyHex = await SecureStore.getItemAsync(secretName, options);
  if (!keyHex) {
    const existing = db.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM resident_local WHERE owner = ?', owner);
    if (existing?.count) throw new Error('Lokal məlumatların açarı tapılmadı. Mövcud qeydlər saxlanıldı.');
    keyHex = bytesToHex(Crypto.getRandomBytes(32));
    await SecureStore.setItemAsync(secretName, keyHex, options);
  }
  const key = hexToBytes(keyHex);
  const aad = (recordKey: string) => `${owner}:${recordKey}`;
  const write = (account: string, recordKey: string, value: string) => {
    const envelope = seal(key, Crypto.getRandomBytes(12), aad(recordKey), value);
    db.runSync('INSERT INTO resident_local (owner, key, payload) VALUES (?, ?, ?) ON CONFLICT(owner, key) DO UPDATE SET payload = excluded.payload',
      account, recordKey, JSON.stringify(envelope));
  };
  const open = (account: string, payload: string, recordKey: string) => {
    const envelope = JSON.parse(payload) as Envelope, value = openEnvelope(key, aad(recordKey), envelope);
    // Records written before v2 are rewritten once, so later opens read the smaller format.
    if (envelope.v !== 2) write(account, recordKey, value);
    return value;
  };
  const storage: LocalStorage = {
    read: (account, recordKey) => {
      const row = db.getFirstSync<{ payload: string }>('SELECT payload FROM resident_local WHERE owner = ? AND key = ?', account, recordKey);
      return row ? open(account, row.payload, recordKey) : null;
    },
    write,
    remove: (account, recordKey) => { db.runSync('DELETE FROM resident_local WHERE owner = ? AND key = ?', account, recordKey); },
    list: account => db.getAllSync<{ key: string; payload: string }>(
      "SELECT key, payload FROM resident_local WHERE owner = ? AND key LIKE 'draft:%'", account)
      .map(row => open(account, row.payload, row.key)),
  };
  return new ResidentStore(storage, owner, () => Crypto.randomUUID());
}

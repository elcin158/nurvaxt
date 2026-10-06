import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
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
  const open = (payload: string, recordKey: string) => {
    const envelope = JSON.parse(payload) as { nonce: string; data: string };
    return new TextDecoder().decode(gcm(key, hexToBytes(envelope.nonce), utf8ToBytes(`${owner}:${recordKey}`))
      .decrypt(hexToBytes(envelope.data)));
  };
  const storage: LocalStorage = {
    read: (account, recordKey) => {
      const row = db.getFirstSync<{ payload: string }>('SELECT payload FROM resident_local WHERE owner = ? AND key = ?', account, recordKey);
      return row ? open(row.payload, recordKey) : null;
    },
    write: (account, recordKey, value) => {
      const nonce = Crypto.getRandomBytes(12);
      const data = gcm(key, nonce, utf8ToBytes(`${owner}:${recordKey}`)).encrypt(utf8ToBytes(value));
      db.runSync('INSERT INTO resident_local (owner, key, payload) VALUES (?, ?, ?) ON CONFLICT(owner, key) DO UPDATE SET payload = excluded.payload',
        account, recordKey, JSON.stringify({ nonce: bytesToHex(nonce), data: bytesToHex(data) }));
    },
    remove: (account, recordKey) => { db.runSync('DELETE FROM resident_local WHERE owner = ? AND key = ?', account, recordKey); },
    list: account => db.getAllSync<{ key: string; payload: string }>(
      "SELECT key, payload FROM resident_local WHERE owner = ? AND key LIKE 'draft:%'", account)
      .map(row => open(row.payload, row.key)),
  };
  return new ResidentStore(storage, owner, () => Crypto.randomUUID());
}

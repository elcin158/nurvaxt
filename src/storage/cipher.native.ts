import { Buffer, createCipheriv, createDecipheriv } from 'react-native-quick-crypto';
import { toByteArray } from 'react-native-quick-base64';
import * as SQLite from 'expo-sqlite';
import type { Envelope } from './envelope';

// AES-256-GCM runs natively: the reference catalogue is several megabytes, and the JavaScript
// cipher blocked the UI thread for seconds on every unlock. The wire format is unchanged
// (ciphertext followed by the 16-byte tag), so records written by either implementation open.
const TAG = 16;
export function seal(key: Uint8Array, nonce: Uint8Array, aad: string, text: string): Envelope {
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(nonce));
  cipher.setAAD(Buffer.from(new TextEncoder().encode(aad)));
  const data = Buffer.concat([cipher.update(Buffer.from(new TextEncoder().encode(text))), cipher.final(), cipher.getAuthTag()]);
  return { v: 2, nonce: Buffer.from(nonce).toString('base64'), data: data.toString('base64') };
}

// Hermes has no native TextDecoder, and Expo's JavaScript fallback took 8–13 s on the ~20 MB
// catalogue. SQLite decodes UTF-8 in C; the in-memory database never touches the disk.
let memory: SQLite.SQLiteDatabase | null = null;
function utf8(bytes: Uint8Array): string {
  memory ??= SQLite.openDatabaseSync(':memory:');
  return memory.getFirstSync<{ text: string }>('SELECT CAST(? AS TEXT) AS text', bytes)?.text ?? '';
}

export function open(key: Uint8Array, aad: string, envelope: Envelope): string {
  // Buffer.from(base64) copies the decoded bytes back one by one in JavaScript (~10 s for the
  // catalogue). toByteArray returns the natively decoded buffer as is.
  const bytes = (value: string) => envelope.v === 2 ? Buffer.from(toByteArray(value).buffer as ArrayBuffer) : Buffer.from(value, 'hex');
  const nonce = bytes(envelope.nonce), data = bytes(envelope.data);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key), nonce);
  decipher.setAAD(Buffer.from(new TextEncoder().encode(aad)));
  decipher.setAuthTag(data.subarray(data.length - TAG));
  const plain = Buffer.concat([decipher.update(data.subarray(0, data.length - TAG)), decipher.final()]);
  return utf8(new Uint8Array(plain.buffer, plain.byteOffset, plain.byteLength));
}

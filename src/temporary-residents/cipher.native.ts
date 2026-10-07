import { Buffer, createCipheriv, createDecipheriv } from 'react-native-quick-crypto';
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
export function open(key: Uint8Array, aad: string, envelope: Envelope): string {
  const encoding = envelope.v === 2 ? 'base64' : 'hex';
  const nonce = Buffer.from(envelope.nonce, encoding), data = Buffer.from(envelope.data, encoding);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key), nonce);
  decipher.setAAD(Buffer.from(new TextEncoder().encode(aad)));
  decipher.setAuthTag(data.subarray(data.length - TAG));
  const plain = Buffer.concat([decipher.update(data.subarray(0, data.length - TAG)), decipher.final()]);
  return new TextDecoder().decode(new Uint8Array(plain.buffer, plain.byteOffset, plain.byteLength));
}

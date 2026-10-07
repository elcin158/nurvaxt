import { gcm } from '@noble/ciphers/aes.js';
import { hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { b64, type Envelope } from './envelope';

// Web and Node tools use the JavaScript AES-GCM. Native builds use cipher.native.ts.
export function seal(key: Uint8Array, nonce: Uint8Array, aad: string, text: string): Envelope {
  return { v: 2, nonce: b64.encode(nonce), data: b64.encode(gcm(key, nonce, utf8ToBytes(aad)).encrypt(utf8ToBytes(text))) };
}
export function open(key: Uint8Array, aad: string, envelope: Envelope): string {
  const nonce = envelope.v === 2 ? b64.decode(envelope.nonce) : hexToBytes(envelope.nonce);
  const data = envelope.v === 2 ? b64.decode(envelope.data) : hexToBytes(envelope.data);
  return new TextDecoder().decode(gcm(key, nonce, utf8ToBytes(aad)).decrypt(data));
}

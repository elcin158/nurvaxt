/** v1 envelopes (hex) are still read; every write uses v2 (base64), which is half the size. */
export type Envelope = { v?: 2; nonce: string; data: string };
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export const b64 = {
  encode(bytes: Uint8Array) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
      out += alphabet[n >> 18 & 63] + alphabet[n >> 12 & 63] + (i + 1 < bytes.length ? alphabet[n >> 6 & 63] : '=') + (i + 2 < bytes.length ? alphabet[n & 63] : '=');
    }
    return out;
  },
  decode(text: string) {
    const clean = text.replace(/=+$/, ''), bytes = new Uint8Array(Math.floor(clean.length * 3 / 4));
    let bits = 0, value = 0, index = 0;
    for (const char of clean) {
      value = (value << 6) | alphabet.indexOf(char); bits += 6;
      if (bits >= 8) { bits -= 8; bytes[index++] = (value >> bits) & 255; }
    }
    return bytes;
  },
};

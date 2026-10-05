import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { PIN_KEY_ITERATIONS, PIN_KEY_LENGTH, type DerivePinKey } from './pinKeyOptions';

// Web and non-native tools retain the compatible JavaScript implementation.
export const derivePinKey: DerivePinKey = (password, salt) =>
  pbkdf2Async(sha256, password, salt, { c: PIN_KEY_ITERATIONS, dkLen: PIN_KEY_LENGTH });

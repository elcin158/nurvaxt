import { pbkdf2 } from 'react-native-quick-crypto';
import { PIN_KEY_ITERATIONS, PIN_KEY_LENGTH, type DerivePinKey } from './pinKeyOptions';

// Run PBKDF2 on a native worker, keeping the JS/UI thread free. The parameters
// and input bytes match v1 vaults, so existing PINs continue to unlock them.
export const derivePinKey: DerivePinKey = (password, salt) => new Promise((resolve, reject) => {
  pbkdf2(password, salt, PIN_KEY_ITERATIONS, PIN_KEY_LENGTH, 'sha256', (error, key) => {
    if (error) { reject(error); return; }
    if (!key) { reject(new Error('PIN açarı yaradılmadı.')); return; }
    resolve(new Uint8Array(key));
    key.fill(0);
  });
});

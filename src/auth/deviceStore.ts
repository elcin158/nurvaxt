import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { SessionVault, type SecretStore } from './vault';

const options = (biometric = false): SecureStore.SecureStoreOptions => ({
  keychainService: biometric ? 'evtas.biometric.v1' : 'evtas.session.v1',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: biometric,
  authenticationPrompt: 'EVTAS tətbiqini açın',
});
const store: SecretStore = {
  get: async (key, biometric) => {
    if (key !== 'evtas.session') return SecureStore.getItemAsync(key, options(biometric));
    const file = new File(Paths.document, 'session.vault');
    return file.exists ? file.text() : null;
  },
  set: async (key, value, biometric) => {
    if (key !== 'evtas.session') return SecureStore.setItemAsync(key, value, options(biometric));
    // Encrypted profiles with many settlements can exceed Keychain size limits.
    const temporary = new File(Paths.document, 'session.vault.tmp');
    temporary.write(value);
    const target = new File(Paths.document, 'session.vault');
    if (target.exists) target.delete();
    temporary.move(target);
  },
  remove: async (key, biometric) => {
    if (key !== 'evtas.session') return SecureStore.deleteItemAsync(key, options(biometric));
    for (const name of ['session.vault', 'session.vault.tmp']) {
      const file = new File(Paths.document, name);
      if (file.exists) file.delete();
    }
  },
};
export const vault = new SessionVault(store, (length) => Crypto.getRandomBytes(length));

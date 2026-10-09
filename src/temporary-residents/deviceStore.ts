import * as Crypto from 'expo-crypto';
import { openEncryptedStorage, purgeKey } from '../storage/encryptedStorage';
import { ResidentStore } from './store';

const location = { file: 'evtas-residents.db', table: 'resident_local', keychainService: 'evtas.residents.v1', secretPrefix: 'evtas.residents' };
const opening = new Map<string, Promise<ResidentStore>>();
export function openResidentStore(owner: string): Promise<ResidentStore> {
  const existing = opening.get(owner);
  if (existing) return existing;
  const promise = openEncryptedStorage(location, owner).then(storage => new ResidentStore(storage, owner, () => Crypto.randomUUID()))
    .finally(() => { opening.delete(owner); });
  opening.set(owner, promise);
  return promise;
}

/** Before the shared reference data, each module kept its own ~28 MB catalogue under this key. */
export const purgeLegacyCatalog = () => purgeKey(location, 'catalog');

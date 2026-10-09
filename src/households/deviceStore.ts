import * as Crypto from 'expo-crypto';
import { openEncryptedStorage, purgeKey } from '../storage/encryptedStorage';
import { HouseholdStore } from './store';

const location = { file: 'evtas-households.db', table: 'household_local', keychainService: 'evtas.households.v1', secretPrefix: 'evtas.households' };
const opening = new Map<string, Promise<HouseholdStore>>();
export function openHouseholdStore(owner: string): Promise<HouseholdStore> {
  const existing = opening.get(owner);
  if (existing) return existing;
  const promise = openEncryptedStorage(location, owner).then(storage => new HouseholdStore(storage, owner, () => Crypto.randomUUID()))
    .finally(() => { opening.delete(owner); });
  opening.set(owner, promise);
  return promise;
}

/** Before the shared reference data, each module kept its own ~28 MB catalogue under this key. */
export const purgeLegacyCatalog = () => purgeKey(location, 'catalog');

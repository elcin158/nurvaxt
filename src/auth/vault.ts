import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { derivePinKey } from './pinKey';
import type { DerivePinKey } from './pinKeyOptions';
import type { Session } from './types';

export interface SecretStore {
  get(key: string, biometric?: boolean): Promise<string | null>;
  set(key: string, value: string, biometric?: boolean): Promise<void>;
  remove(key: string, biometric?: boolean): Promise<void>;
}

type Sealed = { iv: string; ciphertext: string };
type Envelope = { session: Session; receivedAt: number };
type Metadata = {
  version: 1;
  salt: string;
  wrappedKey: Sealed;
  failures: number;
  biometric: boolean;
  lastDeviceTime: number;
};

const keys = { meta: 'evtas.meta', pepper: 'evtas.device-secret', session: 'evtas.session', biometric: 'evtas.biometric-key' };
export class VaultError extends Error {
  constructor(public code: 'PIN_INVALID' | 'REAUTH_REQUIRED' | 'BIOMETRIC_UNAVAILABLE' | 'LOCKED', message: string) { super(message); }
}

/** A PIN wraps a random vault key using PBKDF2 + a device-held secret. The
 * session is AES-GCM encrypted, including its refresh token and user profile.
 * Biometrics protect a separate copy of the key in the OS credential store. */
export class SessionVault {
  private unlockedKey: Uint8Array | null = null;
  private generation = 0;
  constructor(private store: SecretStore, private random: (length: number) => Uint8Array,
    private now: () => number = Date.now, private deriveKey: DerivePinKey = derivePinKey) {}

  async exists(): Promise<boolean> { return (await this.store.get(keys.meta)) !== null; }
  async biometricsEnabled(): Promise<boolean> { return (await this.metadata())?.biometric ?? false; }

  async setup(session: Session, pin: string): Promise<void> {
    if (!/^\d{4}$/.test(pin)) throw new VaultError('PIN_INVALID', 'PIN 4 rəqəmdən ibarət olmalıdır.');
    await this.clear();
    const generation = this.generation;
    const vaultKey = this.random(32), salt = this.random(32), pepper = bytesToHex(this.random(32));
    const pinKey = await this.derive(pin, pepper, salt);
    try {
      this.assertGeneration(generation);
      const metadata: Metadata = { version: 1, salt: bytesToHex(salt), wrappedKey: this.seal(vaultKey, pinKey),
        failures: 0, biometric: false, lastDeviceTime: this.now() };
      await this.store.set(keys.pepper, pepper);
      await this.store.set(keys.session, JSON.stringify(this.sealJson({ session, receivedAt: session.receivedAtDevice }, vaultKey)));
      await this.store.set(keys.meta, JSON.stringify(metadata));
      this.assertGeneration(generation);
      this.unlockedKey = vaultKey;
    } finally { pinKey.fill(0); if (this.unlockedKey !== vaultKey) vaultKey.fill(0); }
  }

  async unlockPin(pin: string): Promise<Session> {
    const generation = this.generation;
    const metadata = await this.requireMetadata();
    const pepper = await this.store.get(keys.pepper);
    if (!pepper) return this.requireReauthentication();
    // Persist the attempt before expensive work so killing the app cannot reset it.
    metadata.failures++;
    await this.store.set(keys.meta, JSON.stringify(metadata));
    const pinKey = await this.derive(pin, pepper, hexToBytes(metadata.salt));
    let vaultKey: Uint8Array;
    try { vaultKey = this.open(metadata.wrappedKey, pinKey); }
    catch {
      if (metadata.failures >= 5) return this.requireReauthentication();
      throw new VaultError('PIN_INVALID', `PIN yanlışdır. ${5 - metadata.failures} cəhd qalıb.`);
    } finally { pinKey.fill(0); }
    try {
      this.assertGeneration(generation);
      const session = await this.readSession(vaultKey);
      metadata.failures = 0;
      metadata.lastDeviceTime = this.now();
      await this.store.set(keys.meta, JSON.stringify(metadata));
      this.assertGeneration(generation);
      this.unlockedKey = vaultKey;
      return session;
    } finally { if (this.unlockedKey !== vaultKey) vaultKey.fill(0); }
  }

  async enableBiometrics(): Promise<void> {
    if (!this.unlockedKey) throw new VaultError('LOCKED', 'Tətbiqi əvvəlcə PIN ilə açın.');
    const generation = this.generation;
    const metadata = await this.requireMetadata();
    await this.store.set(keys.biometric, bytesToHex(this.unlockedKey), true);
    this.assertGeneration(generation);
    metadata.biometric = true;
    await this.store.set(keys.meta, JSON.stringify(metadata));
  }

  async unlockBiometric(): Promise<Session> {
    const generation = this.generation;
    const metadata = await this.requireMetadata();
    if (!metadata.biometric) throw new VaultError('BIOMETRIC_UNAVAILABLE', 'Biometrik giriş aktiv deyil.');
    const value = await this.store.get(keys.biometric, true);
    this.assertGeneration(generation);
    if (!value) throw new VaultError('BIOMETRIC_UNAVAILABLE', 'Biometrik giriş mümkün olmadı. PIN istifadə edin.');
    const vaultKey = hexToBytes(value);
    try {
      const session = await this.readSession(vaultKey);
      metadata.failures = 0;
      metadata.lastDeviceTime = this.now();
      await this.store.set(keys.meta, JSON.stringify(metadata));
      this.assertGeneration(generation);
      this.unlockedKey = vaultKey;
      return session;
    } finally { if (this.unlockedKey !== vaultKey) vaultKey.fill(0); }
  }

  async update(session: Session): Promise<void> {
    if (!this.unlockedKey) throw new VaultError('LOCKED', 'Tətbiq kilidlənib.');
    const metadata = await this.requireMetadata();
    if (!this.unlockedKey) throw new VaultError('LOCKED', 'Tətbiq kilidlənib.');
    await this.store.set(keys.session, JSON.stringify(this.sealJson({ session, receivedAt: session.receivedAtDevice }, this.unlockedKey)));
    metadata.lastDeviceTime = this.now();
    await this.store.set(keys.meta, JSON.stringify(metadata));
  }

  /** Called while the app is visible too: leaving Home open must not bypass expiry. */
  async assertSessionValid(): Promise<void> {
    if (!this.unlockedKey) throw new VaultError('LOCKED', 'Tətbiq kilidlənib.');
    const metadata = await this.requireMetadata();
    if (!this.unlockedKey) throw new VaultError('LOCKED', 'Tətbiq kilidlənib.');
    await this.readSession(this.unlockedKey);
    metadata.lastDeviceTime = this.now();
    await this.store.set(keys.meta, JSON.stringify(metadata));
  }

  lock(): void { this.generation++; this.unlockedKey?.fill(0); this.unlockedKey = null; }
  async clear(): Promise<void> {
    this.lock();
    await this.store.remove(keys.meta);
    await this.store.remove(keys.session);
    await this.store.remove(keys.pepper);
    await this.store.remove(keys.biometric, true);
  }

  private async derive(pin: string, pepper: string, salt: Uint8Array): Promise<Uint8Array> {
    const password = utf8ToBytes(`${pin}:${pepper}`);
    try { return await this.deriveKey(password, salt); }
    finally { password.fill(0); }
  }
  private seal(data: Uint8Array, key: Uint8Array): Sealed {
    const iv = this.random(12);
    return { iv: bytesToHex(iv), ciphertext: bytesToHex(gcm(key, iv).encrypt(data)) };
  }
  private sealJson(value: Envelope, key: Uint8Array): Sealed { return this.seal(utf8ToBytes(JSON.stringify(value)), key); }
  private open(value: Sealed, key: Uint8Array): Uint8Array {
    return gcm(key, hexToBytes(value.iv)).decrypt(hexToBytes(value.ciphertext));
  }
  private async metadata(): Promise<Metadata | null> {
    const value = await this.store.get(keys.meta);
    if (!value) return null;
    try {
      const parsed = JSON.parse(value) as Metadata;
      if (parsed.version !== 1 || !Number.isInteger(parsed.failures) || parsed.failures < 0 ||
        !Number.isFinite(parsed.lastDeviceTime)) return this.requireReauthentication();
      return parsed;
    } catch { return this.requireReauthentication(); }
  }
  private async requireMetadata(): Promise<Metadata> {
    const metadata = await this.metadata();
    if (!metadata || metadata.failures >= 5 || this.now() < metadata.lastDeviceTime - 30_000)
      return this.requireReauthentication();
    return metadata;
  }
  private async readSession(key: Uint8Array): Promise<Session> {
    const raw = await this.store.get(keys.session);
    if (!raw) return this.requireReauthentication();
    let envelope: Envelope;
    try { envelope = JSON.parse(new TextDecoder().decode(this.open(JSON.parse(raw), key))) as Envelope; }
    catch { return this.requireReauthentication(); }
    if (!envelope?.session?.user || typeof envelope.session.refreshToken !== 'string') return this.requireReauthentication();
    const { session, receivedAt } = envelope;
    const serverTime = Date.parse(session.serverTime), expires = Date.parse(session.sessionExpiresAt);
    const elapsed = this.now() - receivedAt;
    if (!Number.isFinite(serverTime) || !Number.isFinite(expires) || !Number.isFinite(receivedAt) ||
      elapsed < -30_000 || serverTime + Math.max(0, elapsed) >= expires)
      return this.requireReauthentication();
    return session;
  }
  private assertGeneration(value: number): void {
    if (value !== this.generation) throw new VaultError('LOCKED', 'Tətbiq kilidlənib.');
  }
  private async requireReauthentication(): Promise<never> {
    await this.clear();
    throw new VaultError('REAUTH_REQUIRED', 'Digital Login ilə yenidən daxil olun.');
  }
}

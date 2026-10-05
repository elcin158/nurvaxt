import assert from 'node:assert/strict';
import { randomBytes, pbkdf2, pbkdf2Sync } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);

// Exercise the native adapter with Node's native PBKDF2 on the host. Actual
// Android/iOS Nitro integration still requires a development build.
const nativeModule = require.resolve('react-native-quick-crypto');
require.cache[nativeModule] = { id: nativeModule, filename: nativeModule, loaded: true, exports: { pbkdf2 } };
const { SessionVault } = require('../src/auth/vault.ts');
const { derivePinKey } = require('../src/auth/pinKey.native.ts');
const { api, ApiConnectionError, ApiError } = require('../src/auth/api.ts');

function fixture(derive) {
  const values = new Map();
  const store = {
    get: async key => values.get(key) ?? null,
    set: async (key, value) => { values.set(key, value); },
    remove: async key => { values.delete(key); },
  };
  let now = Date.now();
  const session = {
    accessToken: 'test-access-token', refreshToken: 'test-refresh-token',
    accessTokenExpiresAt: new Date(now + 60_000).toISOString(),
    sessionExpiresAt: new Date(now + 86_400_000).toISOString(),
    serverTime: new Date(now).toISOString(), receivedAtDevice: now,
    user: { id: 'test-user', displayName: 'Test', executiveId: 1, departmentId: null,
      roleIds: [], settlementIds: [] },
  };
  return {
    values, store, session, vault: new SessionVault(store, randomBytes, () => now, derive),
    reopen: () => new SessionVault(store, randomBytes, () => now, derivePinKey),
    advance: ms => { now += ms; },
  };
}

test('native PIN adapter retains v1 parameters and copies the result before wiping it', async () => {
  const password = new TextEncoder().encode(`1234:${'ab'.repeat(32)}`);
  const paddedSalt = new Uint8Array(40).fill(42);
  const salt = paddedSalt.subarray(4, 36);
  const expected = pbkdf2Sync(password, salt, 210_000, 32, 'sha256');
  assert.deepEqual(await derivePinKey(password, salt), new Uint8Array(expected));
});

test('an existing JavaScript-created vault unlocks with the native adapter', async () => {
  const f = fixture();
  await f.vault.setup(f.session, '1234');
  f.vault.lock();
  const reopened = f.reopen();
  assert.deepEqual(await reopened.unlockPin('1234'), f.session);
  assert.equal(JSON.parse(f.values.get('evtas.meta')).failures, 0);
});

test('five incorrect PINs still clear the vault and require Digital Login', async () => {
  const f = fixture(derivePinKey);
  await f.vault.setup(f.session, '1234');
  f.vault.lock();
  for (let attempt = 1; attempt <= 5; attempt++) {
    await assert.rejects(f.vault.unlockPin('0000'), { code: attempt === 5 ? 'REAUTH_REQUIRED' : 'PIN_INVALID' });
    if (attempt < 5) assert.equal(JSON.parse(f.values.get('evtas.meta')).failures, attempt);
  }
  assert.equal(f.values.size, 0);
});

test('a correct native PIN cannot open an expired session', async () => {
  const f = fixture(derivePinKey);
  await f.vault.setup(f.session, '1234');
  f.vault.lock();
  f.advance(86_400_000);
  await assert.rejects(f.vault.unlockPin('1234'), { code: 'REAUTH_REQUIRED' });
});

test('locking during asynchronous derivation cancels unlock', async () => {
  const f = fixture(derivePinKey);
  await f.vault.setup(f.session, '1234');
  f.vault.lock();
  let release, notifyStarted;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { notifyStarted = resolve; });
  // Reuse the encrypted v1 data with an intentionally paused native worker.
  const vault = new SessionVault(f.store, randomBytes, Date.now, async (password, salt) => {
    notifyStarted();
    await gate;
    return derivePinKey(password, salt);
  });
  const pending = vault.unlockPin('1234');
  await started;
  vault.lock();
  release();
  await assert.rejects(pending, { code: 'LOCKED' });
  // Nothing from the failed unlock was installed as an unlocked key.
  await assert.rejects(vault.assertSessionValid(), { code: 'LOCKED' });
});

function apiFixture(t, fetch) {
  const previousDev = globalThis.__DEV__;
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  globalThis.__DEV__ = false;
  process.env.EXPO_PUBLIC_API_URL = 'https://api.test.invalid';
  t.mock.method(globalThis, 'fetch', fetch);
  t.after(() => {
    if (previousDev === undefined) delete globalThis.__DEV__;
    else globalThis.__DEV__ = previousDev;
    if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previousUrl;
  });
}

test('refresh stops at 3s and normalizes React Native plain cancellation errors', async t => {
  let signal;
  apiFixture(t, async (_url, options) => new Promise((_resolve, reject) => {
    signal = options.signal;
    signal.addEventListener('abort', () => reject(new Error('Fetch request has been canceled')));
  }));
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = api.refresh('test-refresh-token');
  t.mock.timers.tick(2_999);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(1);
  await assert.rejects(pending, cause => cause instanceof ApiConnectionError && cause.timedOut);
});

test('Digital Login retains its longer 20s request allowance', async t => {
  let signal;
  apiFixture(t, async (_url, options) => new Promise((_resolve, reject) => {
    signal = options.signal;
    signal.addEventListener('abort', () => reject(new Error('Fetch request has been canceled')));
  }));
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = api.start('test-challenge');
  t.mock.timers.tick(3_000);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(17_000);
  await assert.rejects(pending, cause => cause instanceof ApiConnectionError && cause.timedOut);
});

test('the refresh deadline also covers a stalled response body', async t => {
  let notifyReading;
  const reading = new Promise(resolve => { notifyReading = resolve; });
  apiFixture(t, async (_url, options) => ({
    ok: true, status: 200,
    json: () => new Promise((_resolve, reject) => {
      notifyReading();
      options.signal.addEventListener('abort', () => reject(new Error('Fetch request has been canceled')));
    }),
  }));
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = api.refresh('test-refresh-token');
  await reading;
  t.mock.timers.tick(3_000);
  await assert.rejects(pending, cause => cause instanceof ApiConnectionError && cause.timedOut);
});

test('a stalled 401 error body cannot turn a revoked session into offline access', async t => {
  let notifyReading;
  const reading = new Promise(resolve => { notifyReading = resolve; });
  apiFixture(t, async (_url, options) => ({
    ok: false, status: 401,
    json: () => new Promise((_resolve, reject) => {
      notifyReading();
      options.signal.addEventListener('abort', () => reject(new Error('Fetch request has been canceled')));
    }),
  }));
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = api.refresh('test-refresh-token');
  await reading;
  t.mock.timers.tick(3_000);
  await assert.rejects(pending, cause => cause instanceof ApiError && cause.status === 401);
});

test('transport errors are distinct from server authentication rejection', async t => {
  apiFixture(t, async () => { throw new Error('Network request failed'); });
  await assert.rejects(api.refresh('test-refresh-token'), cause => cause instanceof ApiConnectionError && !cause.timedOut);
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ title: 'Revoked' }), { status: 401 }));
  await assert.rejects(api.refresh('test-refresh-token'), cause => cause instanceof ApiError && cause.status === 401);
});

test('profile names load using the access token without rotating the saved session', async t => {
  const f = fixture(derivePinKey);
  const user = { ...f.session.user, executiveName: 'Abşeron Rayon İcra Hakimiyyəti',
    settlementIds: [201, 205], settlements: [
      { id: 201, name: 'Qobu qəsəbə iəd', type: 'iəd' },
      { id: 205, name: 'Novxanı kənd iəd', type: 'iəd' },
    ] };
  apiFixture(t, async (url, options) => {
    assert.equal(url, 'https://api.test.invalid/api/v1/auth/me');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, `Bearer ${f.session.accessToken}`);
    assert.equal(options.body, undefined);
    return new Response(JSON.stringify(user));
  });
  await f.vault.setup(f.session, '1234');
  const updated = { ...f.session, user: await api.me(f.session.accessToken) };
  await f.vault.update(updated);
  f.vault.lock();
  const restored = await f.reopen().unlockPin('1234');
  assert.deepEqual(restored.user, user);
  assert.equal(restored.refreshToken, f.session.refreshToken);
  assert.equal(restored.sessionExpiresAt, f.session.sessionExpiresAt);
});

test('a profile lookup times out without blocking indefinitely', async t => {
  apiFixture(t, async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Fetch request has been canceled')));
  }));
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = api.me('test-access-token');
  t.mock.timers.tick(3_000);
  await assert.rejects(pending, cause => cause instanceof ApiConnectionError && cause.timedOut);
});

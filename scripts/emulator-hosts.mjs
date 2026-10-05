// Maps the local API domain to the host machine (10.0.2.2) inside an Android emulator.
// The emulator must be started with -writable-system; physical devices are not supported.
import { execFileSync, spawnSync } from 'node:child_process';

const DOMAIN = 'etrrihmobilelocal.idda.az';
const ENTRY = `10.0.2.2 ${DOMAIN}`;

const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForBoot() {
  adb('wait-for-device');
  for (let i = 0; i < 120; i++) {
    try { if (adb('shell', 'getprop', 'sys.boot_completed').trim() === '1') return; } catch { /* still booting */ }
    await sleep(2000);
  }
  throw new Error('Emulator açılmadı.');
}

async function remount() {
  // adbd may still be restarting right after boot; retry before giving up.
  for (let attempt = 1; ; attempt++) {
    try { adb('root'); break; } catch (error) { if (attempt >= 5) throw error; await sleep(3000); }
  }
  await waitForBoot();
  // remount reports "reboot" on stderr, so read both streams.
  const result = spawnSync('adb', ['remount'], { encoding: 'utf8' });
  return `${result.stdout}${result.stderr}`;
}

try {
  if (!adb('devices').split('\n').some((line) => /^emulator-\d+\s+device/.test(line)))
    throw new Error('İşləyən emulator tapılmadı. Emulatoru -writable-system ilə açın.');

  // The first remount disables verity and asks for a reboot before /system becomes writable.
  if (/reboot/i.test(await remount())) {
    console.log('Emulator yenidən başladılır...');
    adb('reboot');
    await waitForBoot();
    await remount();
  }

  const hosts = adb('shell', 'cat', '/system/etc/hosts');
  if (!hosts.includes(DOMAIN)) adb('shell', `echo '${ENTRY}' >> /system/etc/hosts`);

  const updated = adb('shell', 'cat', '/system/etc/hosts');
  if (!updated.includes(ENTRY)) throw new Error('/system/etc/hosts yazıla bilmədi. Emulator -writable-system ilə açılıbmı?');
  console.log(updated.trim());
  console.log(`\n${DOMAIN} → 10.0.2.2 (kompüter) hazırdır.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

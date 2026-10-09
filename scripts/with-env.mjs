// Runs an Expo command with one of the app environments: local, dev, stage, production.
// Usage: node scripts/with-env.mjs <env> <expo args...> [--usb]
// --usb (local only): a physical tablet cannot resolve the local domain, so the app calls
// http://localhost:<port> instead and adb reverse tunnels that port to this computer's API.
// Values from env/<env>.env are put into the process environment, which Expo prefers
// over any .env file, and EXPO_PUBLIC_* values are inlined into the JS bundle.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENVIRONMENTS = ['local', 'dev', 'stage', 'production'];
const [name, ...rest] = process.argv.slice(2);
const usb = rest.includes('--usb');
const expoArgs = rest.filter((arg) => arg !== '--usb');

if (!ENVIRONMENTS.includes(name) || expoArgs.length === 0) {
  console.error(`İstifadə: node scripts/with-env.mjs <${ENVIRONMENTS.join('|')}> <expo əmri...>`);
  process.exit(1);
}

const file = fileURLToPath(new URL(`../env/${name}.env`, import.meta.url));
const values = {};
for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (match) values[match[1]] = match[2];
}

if (!values.EXPO_PUBLIC_API_URL) {
  console.error(`env/${name}.env: EXPO_PUBLIC_API_URL təyin edilməyib.`);
  process.exit(1);
}

// With --usb, adb commands target the USB device (-d) so a running emulator does not make them ambiguous.
const adbReverse = (port) =>
  spawnSync('adb', [...(usb ? ['-d'] : []), 'reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'ignore' });

if (usb) {
  if (name !== 'local') {
    console.error('--usb yalnız local mühit üçündür.');
    process.exit(1);
  }
  const port = new URL(values.EXPO_PUBLIC_API_URL).port || '80';
  values.EXPO_PUBLIC_API_URL = `http://localhost:${port}`;
  if (adbReverse(port).status !== 0) {
    console.error(`adb reverse tcp:${port} alınmadı. Planşet USB ilə qoşulubmu? (adb devices)`);
    process.exit(1);
  }
  adbReverse(8081);
  // Install on the same USB device, otherwise Expo may pick the emulator or prompt.
  // Expo matches --device against the `model:` field of `adb devices -l`, not the serial.
  const serial = spawnSync('adb', ['-d', 'get-serialno'], { encoding: 'utf8' }).stdout.trim();
  const listing = spawnSync('adb', ['devices', '-l'], { encoding: 'utf8' }).stdout;
  const model = listing.split('\n').find((line) => line.startsWith(`${serial} `))?.match(/model:(\S+)/)?.[1];
  if (expoArgs[0] === 'run:android' && model && !expoArgs.includes('--device')) {
    expoArgs.push('--device', model);
  }
}

console.log(`Mühit: ${name}${usb ? ' (USB)' : ''} → ${values.EXPO_PUBLIC_API_URL}`);

// Metro runs on localhost; forward the device's 8081 so the app and debugger reach it over adb
// (the LAN IP connection drops the debugger websocket). Best effort: no device is fine.
if (expoArgs[0] === 'start') adbReverse(8081);

// Windows needs a shell to run npx.cmd.
const child = spawn('npx', ['expo', ...expoArgs], {
  stdio: 'inherit',
  env: { ...process.env, ...values },
  shell: process.platform === 'win32',
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 0));

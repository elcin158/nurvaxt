import { build } from 'esbuild';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
const root = process.cwd(), output = '/tmp/tbu-households-preview';
await mkdir(output, { recursive: true });
await build({ entryPoints: ['tests/preview/households-main.tsx'], bundle: true, outfile: `${output}/preview.js`, jsx: 'automatic', resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
  define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'true' }, loader: { '.png': 'dataurl' },
  alias: { 'react-native': 'react-native-web' }, plugins: [{ name: 'visual-fixtures', setup(builder) {
    builder.onResolve({ filter: /expo-router$/ }, () => ({ path: path.join(root, 'tests/preview/router.tsx') }));
    builder.onResolve({ filter: /expo-status-bar$/ }, () => ({ path: 'status', namespace: 'mock' }));
    builder.onResolve({ filter: /(^|\/)App$/ }, () => ({ path: 'auth', namespace: 'mock' }));
    builder.onResolve({ filter: /^\.\/server$/ }, () => ({ path: path.join(root, 'tests/preview/server.ts') }));
    builder.onResolve({ filter: /reference\/context$/ }, () => ({ path: path.join(root, 'tests/preview/mock-reference.tsx') }));
    builder.onResolve({ filter: /notifications\/context$|^\.\/context$/ }, args => args.path.includes('notifications') || args.importer.includes('/notifications/')
      ? { path: path.join(root, 'tests/preview/mock-notifications.tsx') } : undefined);
    builder.onResolve({ filter: /^\.\/context$/ }, () => ({ path: path.join(root, 'tests/preview/mock-households.tsx') }));
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path === 'status' ? 'export const StatusBar = () => null;' : 'export const useAuth = () => ({ session: { user: { displayName: "Sınaq əməkdaşı", executiveName: "Şamaxı rayon İcra Hakimiyyəti" } }, getAccessToken: async () => "preview", lock: () => {}, logout: async () => {} });', loader: 'js' }));
  } }] });
await writeFile(`${output}/index.html`, '<!doctype html><html lang="az"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>EVTAS · Mobil vizual sınaq</title><style>html,body,#root{height:100%;margin:0}#root{display:flex}*{box-sizing:border-box}body{overflow:hidden}</style><div id="root"></div><script src="/preview.js"></script></html>');
createServer(async (req, res) => {
  const js = req.url?.split('?')[0] === '/preview.js';
  res.setHeader('Content-Type', js ? 'application/javascript' : 'text/html');
  res.end(await readFile(`${output}/${js ? 'preview.js' : 'index.html'}`));
}).listen(Number(process.env.PREVIEW_PORT ?? 8098), '127.0.0.1', () => console.log('Visual fixture: http://127.0.0.1:8098'));

import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '../..');
const xml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

// Android produces opaque RGBA screenshots. Export the same pixels as 24-bit RGB PNG.
for (const folder of ['phone', 'tablet-7', 'tablet-10']) {
  for (const file of (await fs.readdir(path.join(root, folder))).filter((f) => f.endsWith('.png'))) {
    const full = path.join(root, folder, file);
    const png = await sharp(full).removeAlpha().png({ compressionLevel: 9 }).toBuffer();
    await fs.writeFile(full, png);
  }
}

await sharp(path.join(repo, 'assets/adaptive-source.png'))
  .resize(512, 512).ensureAlpha().png({ compressionLevel: 9 })
  .toFile(path.join(root, 'app-icon-512.png'));

// All panels use unmodified screenshots of the actual Android release UI.
const home = await sharp(path.join(root, 'phone/01-namaz-vaxtlari.png'))
  .extract({ left: 0, top: 72, width: 1080, height: 1776 }).png().toBuffer();
const calendar = await sharp(path.join(root, 'phone/02-teqvim.png'))
  .extract({ left: 0, top: 72, width: 1080, height: 1776 }).png().toBuffer();
const homeUri = `data:image/png;base64,${home.toString('base64')}`;
const calendarUri = `data:image/png;base64,${calendar.toString('base64')}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="500" viewBox="0 0 1024 500">
<defs>
  <linearGradient id="bg" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#071E5B"/><stop offset=".56" stop-color="#084ABD"/><stop offset="1" stop-color="#087BD6"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="#1FCAFF" stop-opacity=".5"/><stop offset="1" stop-color="#1FCAFF" stop-opacity="0"/></radialGradient>
  <filter id="shadow" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="15" flood-color="#02163A" flood-opacity=".48"/></filter>
  <clipPath id="front"><rect x="555" y="25" width="272" height="447.3" rx="21"/></clipPath>
  <clipPath id="back"><rect x="795" y="95" width="200" height="328.9" rx="17"/></clipPath>
</defs>
<rect width="1024" height="500" fill="url(#bg)"/>
<ellipse cx="856" cy="125" rx="430" ry="420" fill="url(#glow)"/>
<g fill="none" stroke="#A8EFFF" stroke-opacity=".13"><circle cx="992" cy="30" r="303"/><circle cx="992" cy="30" r="354"/></g>
<g font-family="Noto Sans, sans-serif">
  <text x="52" y="89" fill="#FFFFFF" font-size="35" font-weight="700" letter-spacing="-.8">NurVaxt</text>
  <rect x="52" y="113" width="45" height="4" rx="2" fill="#3DD9FF"/>
  <text x="49" y="209" fill="#FFFFFF" font-size="62" font-weight="700" letter-spacing="-1.8">Hər gün,</text>
  <text x="49" y="282" fill="#FFFFFF" font-size="62" font-weight="700" letter-spacing="-1.8">vaxtında.</text>
  <text x="52" y="331" fill="#D6EEFF" font-size="19">Namaz vaxtları · Təqvim · Qiblə</text>
  <line x1="52" y1="393" x2="480" y2="393" stroke="#92D9FF" stroke-opacity=".27"/>
  <text x="52" y="431" fill="#D6EEFF" font-size="17">Azərbaycanın 74 şəhər və rayonu</text>
</g>
<rect x="791" y="91" width="208" height="336.9" rx="21" fill="#D6F1FF" opacity=".9" filter="url(#shadow)"/>
<image x="795" y="95" width="200" height="328.9" xlink:href="${calendarUri}" clip-path="url(#back)"/>
<rect x="551" y="21" width="280" height="455.3" rx="25" fill="#E9F7FF" filter="url(#shadow)"/>
<image x="555" y="25" width="272" height="447.3" xlink:href="${homeUri}" clip-path="url(#front)"/>
</svg>`;
await fs.writeFile(path.join(root, 'source/feature-graphic.svg'), svg);
await sharp(Buffer.from(svg)).flatten({ background: '#071E5B' }).removeAlpha()
  .png({ compressionLevel: 9 }).toFile(path.join(root, 'feature-graphic-1024x500.png'));

// Compact preview for review; this file is not an upload asset.
const groups = [
  ['phone', 'Telefon · 1080 × 1920'],
  ['tablet-7', '7 düymlük planşet · 1440 × 2560'],
  ['tablet-10', '10 düymlük planşet · 1440 × 2560'],
];
const width = 1380;
const height = 1160;
const tiles = [];
const labels = [];
for (let row = 0; row < groups.length; row++) {
  const [folder, label] = groups[row];
  labels.push(`<text x="32" y="${37 + row * 380}" font-size="23" font-weight="700">${xml(label)}</text>`);
  const files = (await fs.readdir(path.join(root, folder))).filter((f) => f.endsWith('.png')).sort();
  for (let col = 0; col < files.length; col++) {
    const thumb = await sharp(path.join(root, folder, files[col])).resize({ height: 300 }).png().toBuffer();
    tiles.push({ input: thumb, left: 32 + col * 264, top: 57 + row * 380 });
    labels.push(`<text x="32" transform="translate(${col * 264},${376 + row * 380})" font-size="15">${xml(files[col].replace('.png', ''))}</text>`);
  }
}
const caption = `<svg width="${width}" height="${height}"><g fill="#102A52" font-family="Noto Sans, sans-serif">${labels.join('')}</g></svg>`;
await sharp({ create: { width, height, channels: 3, background: '#EBF3FC' } })
  .composite([...tiles, { input: Buffer.from(caption), left: 0, top: 0 }])
  .jpeg({ quality: 88 }).toFile(path.join(root, 'preview.jpg'));

const manifest = [];
for (const folder of ['phone', 'tablet-7', 'tablet-10', '']) {
  const files = (await fs.readdir(path.join(root, folder))).filter((f) => f.endsWith('.png')).sort();
  for (const file of files) {
    const relative = path.join(folder, file);
    const full = path.join(root, relative);
    const metadata = await sharp(full).metadata();
    const bytes = (await fs.stat(full)).size;
    const limit = file.startsWith('app-icon') ? 1024 * 1024 : file.startsWith('feature') ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
    if (bytes > limit) throw new Error(`${relative}: file exceeds Google Play limit`);
    if (folder && metadata.width * 16 !== metadata.height * 9) throw new Error(`${relative}: expected 9:16`);
    if (folder && metadata.width < 1080) throw new Error(`${relative}: too small`);
    if (folder && metadata.hasAlpha) throw new Error(`${relative}: expected 24-bit RGB PNG`);
    if (file.startsWith('feature') && (metadata.width !== 1024 || metadata.height !== 500 || metadata.hasAlpha)) throw new Error('Invalid feature graphic');
    if (file.startsWith('app-icon') && (metadata.width !== 512 || metadata.height !== 512 || !metadata.hasAlpha)) throw new Error('Invalid store icon');
    manifest.push({ file: relative, width: metadata.width, height: metadata.height, bytes, channels: metadata.channels, hasAlpha: metadata.hasAlpha });
  }
}
await fs.writeFile(path.join(root, 'validation.json'), JSON.stringify({
  checkedAt: new Date().toISOString(),
  source: 'Actual Android release build 1.0.6, captured on a disposable Android 15 emulator',
  profiles: {
    phone: { size: '1080x1920', density: 360, logicalWidthDp: 480 },
    'tablet-7': { size: '1440x2560', density: 320, logicalWidthDp: 720 },
    'tablet-10': { size: '1440x2560', density: 240, logicalWidthDp: 960 },
  },
  images: manifest,
}, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));

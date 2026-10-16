/** Rebuild phone campaign from real Android captures. Requires sharp + Noto Sans. */
import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const source = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(source, '..');
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const uri = (bytes, type = 'png') => `data:image/${type};base64,${bytes.toString('base64')}`;
const campaign = [
  { file: '01-namaz-vaxtlari', label: 'NAMAZ VAXTLARI', title: ['Hər namaz,', 'öz vaxtında.'],
    subtitle: 'Beş namaz vaxtı. Bir aydın baxış.', light: false, font: 100,
    alt: 'NurVaxt: Bakı üçün beş gündəlik namaz vaxtı və növbəti namaza qalan vaxt.' },
  { file: '02-teqvim', label: 'TƏQVİM', title: ['Gününüzü', 'öncədən planlayın.'],
    subtitle: 'Günlük və aylıq namaz təqvimi.', light: true, font: 88,
    alt: 'NurVaxt təqvimi: ayın günləri və seçilmiş günün beş namaz vaxtı.' },
  { file: '03-qible', label: 'QİBLƏ', title: ['Qiblənizi', 'asanlıqla tapın.'],
    subtitle: 'Olduğunuz yerdən qiblə istiqaməti.', light: false, font: 96,
    alt: 'NurVaxt qiblə ekranı: kompas, Bakıdan qiblə istiqaməti və Kəbəyə məsafə.' },
  { file: '04-xatirlatmalar', label: 'XATIRLATMALAR', title: ['Vaxtı gəlsin,', 'xəbəriniz olsun.'],
    subtitle: 'Namazdan əvvəl sizə uyğun xatırlatma.', light: true, font: 94,
    alt: 'NurVaxt xatırlatmaları: gündəlik namazlardan əvvəl bildiriş dəqiqələrinin seçilməsi.' },
  { file: '05-tund-gorunus', label: 'TÜND GÖRÜNÜŞ', title: ['Gecəyə uyğun', 'sakit görünüş.'],
    subtitle: 'Eyni aydınlıq. Daha yumşaq rənglər.', light: false, night: true, font: 94,
    alt: 'NurVaxt tünd görünüşdə: beş gündəlik namaz vaxtı və canlı geri sayım.' },
];

const background = uri(await sharp(path.join(source, 'campaign-background.png')).jpeg({ quality: 96 }).toBuffer(), 'jpeg');
const icon = uri(await sharp(path.join(root, 'app-icon-512.png')).resize(120).png().toBuffer());
const screens = {};
for (const item of campaign) {
  const input = path.join(source, 'captures/phone', `${item.file}.png`);
  const meta = await sharp(input).metadata();
  if (meta.width !== 1080 || meta.height !== 2160) throw new Error(`Unexpected raw size: ${input}`);
  // Crop Android status/navigation bars only; preserve every app pixel and its proportions.
  const bytes = await sharp(input).extract({ left: 0, top: 108, width: 1080, height: 1980 })
    .removeAlpha().png({ compressionLevel: 9 }).toBuffer();
  screens[item.file] = { uri: uri(bytes), ratio: 1980 / 1080 };
}

const defs = `<defs>
  <linearGradient id="shade" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#021132" stop-opacity=".78"/><stop offset=".5" stop-color="#031942" stop-opacity=".16"/><stop offset="1" stop-color="#020C27" stop-opacity=".4"/></linearGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#EDF8FF"/><stop offset=".45" stop-color="#81B9EB"/><stop offset="1" stop-color="#D3E6FF"/></linearGradient>
  <linearGradient id="edgeNight" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#82A7E2"/><stop offset=".5" stop-color="#224A89"/><stop offset="1" stop-color="#415B8D"/></linearGradient>
  <linearGradient id="lightBase" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#F5FAFF"/><stop offset="1" stop-color="#DCEBFF"/></linearGradient>
  <filter id="shadow" x="-45%" y="-30%" width="190%" height="180%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="28" stdDeviation="30" flood-color="#000F34" flood-opacity=".34"/></filter>
  <filter id="smallShadow" x="-40%" y="-25%" width="180%" height="170%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="10" stdDeviation="13" flood-color="#000F34" flood-opacity=".42"/></filter>
</defs>`;

function text(x, y, content, size, fill, weight = 400, attrs = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${attrs}>${xml(content)}</text>`;
}

function panel(id, screenName, x, y, width, { night = false, small = false } = {}) {
  const screen = screens[screenName];
  const border = small ? 3 : 7;
  const inset = small ? 5 : 13;
  const innerW = width - inset * 2;
  const innerH = innerW * screen.ratio;
  const height = innerH + inset * 2;
  const radius = small ? 24 : 51;
  return `<g>
    <defs><clipPath id="${id}"><rect x="${x + inset}" y="${y + inset}" width="${innerW}" height="${innerH}" rx="${radius - inset}"/></clipPath></defs>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="url(#${night ? 'edgeNight' : 'edge'})" filter="url(#${small ? 'smallShadow' : 'shadow'})"/>
    <rect x="${x + border}" y="${y + border}" width="${width - border * 2}" height="${height - border * 2}" rx="${radius - border}" fill="${night ? '#0B1120' : '#F8FAFC'}"/>
    <image x="${x + inset}" y="${y + inset}" width="${innerW}" height="${innerH}" href="${screen.uri}" clip-path="url(#${id})"/>
  </g>`;
}

function wrap(width, height, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${xml(title)}</title>${defs}<g font-family="Noto Sans, sans-serif">${body}</g></svg>`;
}

async function exportSvg(name, svg, destination) {
  await fs.writeFile(path.join(source, name + '.svg'), svg);
  await sharp(Buffer.from(svg)).flatten({ background: '#061840' }).removeAlpha()
    .png({ compressionLevel: 9 }).toFile(path.join(root, destination));
}

for (const [index, item] of campaign.entries()) {
  const ink = item.light ? '#101F42' : '#FFFFFF';
  const accent = item.light ? '#065DE2' : '#8EEBFF';
  const muted = item.light ? '#4D627D' : '#D3E4FA';
  const body = `
    <rect width="1080" height="1920" fill="${item.light ? 'url(#lightBase)' : '#062564'}"/>
    <image width="1080" height="1920" href="${background}" preserveAspectRatio="xMaxYMid slice" opacity="${item.light ? '.08' : '1'}"/>
    ${item.light ? '' : '<rect width="1080" height="1920" fill="url(#shade)"/>'}
    ${item.night ? '<rect width="1080" height="1920" fill="#02091C" opacity=".52"/>' : ''}
    <image x="72" y="65" width="58" height="58" href="${icon}"/>
    ${text(148, 107, 'NurVaxt', 34, ink, 700, 'letter-spacing="-1"')}
    ${text(1007, 103, item.label, 20, muted, 700, 'text-anchor="end" letter-spacing="2.8"')}
    ${text(70, 237, item.title[0], item.font, ink, 700, 'letter-spacing="-3.6"')}
    ${text(70, 348, item.title[1], item.font, accent, 700, 'letter-spacing="-3.6"')}
    ${text(74, 408, item.subtitle, 30, muted, 400, 'letter-spacing="-.4"')}
    ${panel('screen', item.file, 164, 474, 752, { night: item.night })}
    <g fill="${item.light ? '#0D5BD7' : '#B4DAFF'}">${campaign.map((_, i) => `<rect x="${485 + i * 27}" y="1874" width="${i === index ? 20 : 6}" height="6" rx="3" opacity="${i === index ? 1 : .32}"/>`).join('')}</g>
  `;
  await exportSvg(item.file, wrap(1080, 1920, body, item.alt), `phone/${item.file}.png`);
}

const featureBody = `
  <image width="1024" height="500" href="${background}" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1024" height="500" fill="url(#shade)"/>
  ${text(64, 88, 'NurVaxt', 28, '#FFFFFF', 700, 'letter-spacing="-1"')}
  <rect x="64" y="108" width="34" height="3" rx="1.5" fill="#7AEAFF"/>
  ${text(60, 211, 'Hər gün,', 67, '#FFFFFF', 700, 'letter-spacing="-2.7"')}
  ${text(60, 291, 'vaxtında.', 67, '#8EEBFF', 700, 'letter-spacing="-2.7"')}
  ${text(64, 338, 'Namaz vaxtları · Təqvim · Qiblə', 20, '#D3E4FA')}
  <rect x="64" y="389" width="290" height="38" rx="19" fill="#71CFFF" fill-opacity=".12" stroke="#B1E3FF" stroke-opacity=".25"/>
  <g transform="translate(79,400)" fill="none" stroke="#8EEBFF" stroke-width="1.6"><path d="M8 17C8 17 1 10 1 6a7 7 0 0 1 14 0c0 4-7 11-7 11Z"/><circle cx="8" cy="6" r="2.3"/></g>
  ${text(104, 414, 'Azərbaycanın 74 şəhər və rayonu', 14, '#E4F2FF')}
  ${panel('back', '03-qible', 798, 129, 162, { small: true })}
  ${panel('front', '01-namaz-vaxtlari', 563, 44, 232, { small: true })}
`;
await exportSvg('feature-graphic', wrap(1024, 500, featureBody,
  'NurVaxt — Hər gün, vaxtında. Beş namaz vaxtı, təqvim və qiblə.'), 'feature-graphic-1024x500.png');

// Campaign-only contact sheet and a separate overview of all upload assets.
const thumbs = await Promise.all(campaign.map(async (item, index) => ({
  input: await sharp(path.join(root, `phone/${item.file}.png`)).resize(270, 480).png().toBuffer(),
  left: 30 + index * 288, top: 48,
})));
const banner = await sharp(path.join(root, 'feature-graphic-1024x500.png')).resize(768, 375).png().toBuffer();
const overviewTitle = Buffer.from(`<svg width="1470" height="970"><g font-family="Noto Sans, sans-serif">${text(30, 29, 'NurVaxt · Google Play · Telefon seriyası', 20, '#203556', 700)}${text(351, 560, 'Tanıtım banneri · 1024 × 500', 18, '#203556', 700)}</g></svg>`);
await sharp({ create: { width: 1470, height: 970, channels: 3, background: '#E8EFF8' } })
  .composite([...thumbs, { input: banner, left: 351, top: 580 }, { input: overviewTitle, left: 0, top: 0 }])
  .jpeg({ quality: 94 }).toFile(path.join(root, 'phone-preview.jpg'));

const fullTiles = [];
for (const [row, folder] of ['phone', 'tablet-7', 'tablet-10'].entries()) {
  const files = (await fs.readdir(path.join(root, folder))).filter((f) => f.endsWith('.png')).sort();
  for (const [column, file] of files.entries()) {
    fullTiles.push({ input: await sharp(path.join(root, folder, file)).resize({ height: 320 }).png().toBuffer(),
      left: 32 + column * 270, top: 58 + row * 385 });
  }
}
const previewLabels = Buffer.from(`<svg width="1390" height="1170"><g font-family="Noto Sans, sans-serif">${[
  'Telefon · Yeni dizayn · 1080 × 1920', '7 düymlük planşet · Əvvəlki çəkilişlər · 1440 × 2560',
  '10 düymlük planşet · Əvvəlki çəkilişlər · 1440 × 2560',
].map((label, i) => text(32, 37 + i * 385, label, 22, '#203556', 700)).join('')}</g></svg>`);
await sharp({ create: { width: 1390, height: 1170, channels: 3, background: '#E8EFF8' } })
  .composite([...fullTiles, { input: previewLabels, left: 0, top: 0 }])
  .jpeg({ quality: 92 }).toFile(path.join(root, 'preview.jpg'));

const images = [];
for (const folder of ['phone', 'tablet-7', 'tablet-10', '']) {
  for (const file of (await fs.readdir(path.join(root, folder))).filter((f) => f.endsWith('.png')).sort()) {
    const relative = path.join(folder, file);
    const full = path.join(root, relative);
    const metadata = await sharp(full).metadata();
    const bytes = (await fs.stat(full)).size;
    const limit = file.startsWith('app-icon') ? 1024 * 1024 : 8 * 1024 * 1024;
    if (bytes > limit) throw new Error(`${relative}: oversized`);
    if (folder && (metadata.width * 16 !== metadata.height * 9 || metadata.width < 1080 || metadata.hasAlpha))
      throw new Error(`${relative}: expected RGB, 9:16 and minimum width 1080`);
    if (file.startsWith('feature') && (metadata.width !== 1024 || metadata.height !== 500 || metadata.hasAlpha))
      throw new Error('Invalid feature graphic');
    if (file.startsWith('app-icon') && (metadata.width !== 512 || metadata.height !== 512 || !metadata.hasAlpha))
      throw new Error('Invalid app icon');
    images.push({ file: relative, width: metadata.width, height: metadata.height, bytes,
      channels: metadata.channels, hasAlpha: metadata.hasAlpha,
      sha256: createHash('sha256').update(await fs.readFile(full)).digest('hex') });
  }
}
await fs.writeFile(path.join(root, 'validation.json'), JSON.stringify({
  checkedAt: new Date().toISOString(),
  source: 'Phone campaign: real Android 15 release screenshots with existing five-prayer visibility setting; AI-generated background, vector typography and framing.',
  capture: JSON.parse(await fs.readFile(path.join(source, 'capture-metadata.json'), 'utf8')),
  composition: { outputSize: [1080, 1920], appCrop: { left: 0, top: 108, width: 1080, height: 1980 },
    appPixelsRetouched: false, marketingCopyOutsideApp: true, appScreenshotAspectRatioPreserved: true },
  unchangedAssets: ['app-icon-512.png', 'tablet-7/', 'tablet-10/', 'nurvaxt-preview-30s.mp4'],
  images,
}, null, 2) + '\n');
await fs.writeFile(path.join(root, 'alt-text-az.md'), '# Google Play üçün alternativ mətnlər\n\n' +
  campaign.map((item) => `- \`phone/${item.file}.png\`: ${item.alt}`).join('\n') +
  '\n- `feature-graphic-1024x500.png`: NurVaxt — Hər gün, vaxtında. Namaz vaxtları, təqvim və qiblə; Azərbaycanın 74 şəhər və rayonu.\n');
console.log(`Exported ${campaign.length} phone images, feature graphic and previews. Validated ${images.length} upload images.`);

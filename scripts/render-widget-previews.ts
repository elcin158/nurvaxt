import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { widgetSvg, type WidgetArtworkData } from '../src/features/widgets/artwork';
import { WIDGET_VARIANTS, type WidgetTheme } from '../src/features/widgets/domain';

async function main() {
  const fontConfig = mkdtempSync(resolve(tmpdir(), 'nurvaxt-widget-fonts-'));
  const fontsPath = resolve('assets/widgets').replaceAll('&', '&amp;');
  writeFileSync(
    `${fontConfig}/fonts.conf`,
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><include ignore_missing="yes">/etc/fonts/fonts.conf</include><dir>${fontsPath}</dir><cachedir>${fontConfig}/cache</cachedir><alias><family>Manrope_700Bold</family><prefer><family>Manrope</family></prefer></alias><alias><family>Manrope_800ExtraBold</family><prefer><family>Manrope</family></prefer></alias></fontconfig>`,
  );
  process.env.FONTCONFIG_FILE = `${fontConfig}/fonts.conf`;
  const data: WidgetArtworkData = {
    values: {
      location: 'Bakı',
      date: '22 oktyabr 2026',
      prayer: 'Əsr',
      time: '16:08',
      remaining: '38 dəq',
      fajr: '05:39',
      dhuhr: '12:25',
      asr: '16:08',
      maghrib: '18:04',
      isha: '19:05',
    },
    selected: 'asr',
    progress: 0.7,
  };
  const folder = 'docs/widgets/design-previews';
  const resources = 'modules/nurvaxt-alarm/android/src/main/res';
  mkdirSync(folder, { recursive: true });
  mkdirSync(`${resources}/drawable-night-nodpi`, { recursive: true });
  for (const variant of WIDGET_VARIANTS) {
    for (const theme of ['dark', 'light'] as WidgetTheme[]) {
      const svg = widgetSvg(variant, theme, data);
      writeFileSync(`${folder}/${variant}-${theme}.svg`, svg);
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      writeFileSync(`${folder}/${variant}-${theme}.png`, png);
      const name = variant === 'compactProgress' ? 'compact_progress' : variant;
      const drawableFolder = theme === 'dark' ? 'drawable-night-nodpi' : 'drawable-nodpi';
      writeFileSync(`${resources}/${drawableFolder}/nurvaxt_widget_preview_${name}.png`, png);
    }
  }
  const placements = [
    ['large', 'dark', 48, 187, 610],
    ['compactProgress', 'light', 48, 595, 610],
    ['strip', 'dark', 44, 717, 626],
    ['strip', 'light', 44, 807, 626],
    ['vertical', 'dark', 686, 141, 304],
    ['compact', 'dark', 1016, 141, 476],
    ['compact', 'light', 1016, 253, 476],
    ['small', 'dark', 1016, 366, 224],
    ['small', 'light', 1268, 366, 224],
    ['list', 'dark', 1017, 592, 228],
    ['list', 'light', 1266, 592, 228],
  ] as const;
  const cards = await Promise.all(
    placements.map(async ([variant, theme, left, top, width]) => ({
      input: await sharp(`${folder}/${variant}-${theme}.png`).resize({ width }).toBuffer(),
      left,
      top,
    })),
  );
  const heading = Buffer.from(
    '<svg width="1536" height="1024"><text x="57" y="65" font-family="Manrope_700Bold, sans-serif" font-size="40" fill="#112854">☾ NurVaxt</text><text x="59" y="106" font-family="Manrope_700Bold, sans-serif" font-size="29" fill="#112854">Widget dizaynları</text><text x="59" y="965" font-family="Manrope_600SemiBold, sans-serif" font-size="20" fill="#112854">Üfüqi geniş   ·   Üfüqi kompakt   ·   Şaquli   ·   Kompakt (2×2)   ·   Siyahı   ·   Açıq və tünd tema</text></svg>',
  );
  await sharp({ create: { width: 1536, height: 1024, channels: 4, background: '#E7F3FF' } })
    .composite([{ input: heading }, ...cards])
    .png()
    .toFile(`${folder}/reference-layout.png`);
  console.log(
    `${WIDGET_VARIANTS.length * 2} previews and reference-layout.png written to ${folder}`,
  );
  rmSync(fontConfig, { recursive: true, force: true });
}
void main();

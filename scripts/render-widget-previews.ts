import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import sharp from 'sharp';
import {
  widgetSvg,
  type WidgetArtworkData,
  type WidgetLayout,
} from '../src/features/widgets/artwork';
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
      clock: '16:08',
      clockNote: '',
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
  const layouts: WidgetLayout[] = [...WIDGET_VARIANTS, 'mini'];
  for (const layout of layouts) {
    for (const theme of ['dark', 'light'] as const) {
      const svg = widgetSvg(layout, theme, data);
      writeFileSync(`${folder}/${layout}-${theme}.svg`, svg);
      const png = await sharp(Buffer.from(svg), { density: layout === 'mini' ? 216 : 72 })
        .png()
        .toBuffer();
      writeFileSync(`${folder}/${layout}-${theme}.png`, png);
      // The small provider opens at 1×1 and switches to its expanded scene on resize.
      if (layout === 'small') continue;
      const name =
        layout === 'mini' ? 'small' : layout === 'compactProgress' ? 'compact_progress' : layout;
      const drawableFolder = theme === 'dark' ? 'drawable-night-nodpi' : 'drawable-nodpi';
      writeFileSync(`${resources}/${drawableFolder}/nurvaxt_widget_preview_${name}.png`, png);
    }
  }

  const placements = [
    ['large', 0, 0, 520],
    ['vertical', 0, 305, 205],
    ['list', 222, 305, 165],
    ['mini', 408, 305, 100],
    ['small', 222, 487, 165],
    ['compact', 0, 656, 404],
    ['compactProgress', 0, 772, 518],
    ['strip', 0, 889, 520],
  ] as const;
  const themes: WidgetTheme[] = ['light', 'dark'];
  const cards = await Promise.all(
    themes.flatMap((theme, i) =>
      placements.map(async ([layout, x, y, width]) => ({
        input: await sharp(`${folder}/${layout}-${theme}.svg`).resize({ width }).png().toBuffer(),
        left: 38 + i * 580 + x,
        top: 140 + y,
      })),
    ),
  );
  const sheet = Buffer.from(
    '<svg width="1160" height="1140"><rect width="580" height="1140" fill="#DAE5E7"/><rect x="580" width="580" height="1140" fill="#283844"/><g font-family="Manrope, sans-serif" font-weight="700"><text x="38" y="62" font-size="32" fill="#18333F">NurVaxt</text><text x="618" y="62" font-size="32" fill="#F0F6FA">NurVaxt</text><text x="38" y="102" font-size="21" fill="#46616D">Açıq rejim</text><text x="618" y="102" font-size="21" fill="#BAD1DC">Tünd rejim</text></g></svg>',
  );
  await sharp(sheet).composite(cards).png().toFile(`${folder}/reference-layout.png`);
  console.log(
    `${layouts.length * themes.length} previews and reference-layout.png written to ${folder}`,
  );
  rmSync(fontConfig, { recursive: true, force: true });
}
void main();

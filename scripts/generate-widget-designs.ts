import { writeFileSync } from 'node:fs';
import { crescentPath } from '../src/components/brand/crescentPath';
import { widgetFontMetrics } from './widget-font-metrics';

// A single scene per layout drives Android Canvas and the launcher previews.
type Element = Record<string, string | number>;
const text = (
  value: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
  extra: Element = {},
): Element => ({
  type: 'text',
  value,
  x,
  y,
  size,
  maxWidth,
  fill: 'ink',
  weight: 'bold',
  ...extra,
});
const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Element = {},
): Element => ({ type: 'rect', x, y, width, height, radius: 0, ...extra });
const icon = (name: string, x: number, y: number, size: number, extra: Element = {}): Element => ({
  type: 'icon',
  name,
  x,
  y,
  size,
  fill: name === 'moon' ? 'moon' : 'ink',
  ...extra,
});
const progress = (x: number, y: number, width: number): Element => ({
  type: 'progress',
  x,
  y,
  width,
});
const location = (right: number, y: number, size: number, maxWidth: number): Element[] => [
  text('{location}', right, y, size, maxWidth, {
    align: 'right',
    weight: 'semi',
    pin: 1,
    fill: 'location',
  }),
];
const brand = (x: number, y: number, size: number): Element[] => [
  icon('moon', x, y - size, size + 5),
  text('NurVaxt', x + size + 12, y, size, size * 5),
];
const fields = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const labels = ['Sübh', 'Zöhr', 'Əsr', 'Məğrib', 'İşa'];
function rows(top: number, rowHeight: number, width: number, fontSize: number): Element[] {
  return fields.flatMap((field, i) => {
    const y = top + i * rowHeight;
    const baseline = y + rowHeight / 2 + fontSize * 0.36;
    return [
      rect(12, y + 1, width - 24, rowHeight - 2, {
        radius: 12,
        fill: 'selected',
        when: field,
      }),
      rect(18, y + rowHeight * 0.31, 3, rowHeight * 0.38, {
        radius: 1.5,
        fill: 'accent',
        when: field,
      }),
      text(labels[i]!, 28, baseline, fontSize, width * 0.4, { weight: 'semi' }),
      text(`{${field}}`, width - 28, baseline, fontSize + 1, width * 0.43, { align: 'right' }),
    ];
  });
}

function strip(
  top: number,
  height: number,
  start: number,
  width: number,
  labelSize: number,
  timeSize: number,
): Element[] {
  const cell = width / fields.length;
  return fields.flatMap((field, i) => {
    const left = start + i * cell;
    const center = left + cell / 2;
    return [
      rect(left + 2, top, cell - 4, height, { radius: 12, fill: 'selected', when: field }),
      text(labels[i]!, center, top + height * 0.41, labelSize, cell - 10, {
        align: 'center',
        weight: 'semi',
        fill: 'muted',
      }),
      text(`{${field}}`, center, top + height * 0.8, timeSize, cell - 8, { align: 'center' }),
    ];
  });
}

const designs = {
  large: {
    width: 610,
    height: 336,
    radius: 36,
    background: 'surface',
    elements: [
      ...brand(35, 49, 24),
      ...location(575, 48, 21, 208),
      text('{date}', 36, 84, 20, 410, { weight: 'semi', fill: 'muted' }),
      text('{prayer}', 36, 139, 34, 265, { fill: 'accent' }),
      text('{time}', 34, 200, 62, 310),
      text('{remaining}', 574, 190, 35, 213, { align: 'right', weight: 'semi' }),
      progress(36, 222, 538),
      ...strip(246, 71, 22, 566, 21, 28),
    ],
  },
  vertical: {
    width: 304,
    height: 482,
    radius: 36,
    background: 'surface',
    elements: [
      ...brand(28, 40, 20),
      ...location(278, 39, 17, 99),
      text('{date}', 29, 71, 19, 246, { weight: 'semi', fill: 'muted' }),
      text('{prayer}', 29, 127, 36, 245, { fill: 'accent' }),
      text('{time}', 27, 178, 54, 250),
      text('{remaining}', 29, 213, 24, 246, { weight: 'semi', fill: 'muted' }),
      progress(29, 236, 246),
      ...rows(254, 42, 304, 22),
    ],
  },
  compact: {
    width: 404,
    height: 100,
    radius: 30,
    background: 'surface',
    elements: [
      text('{prayer}', 25, 40, 26, 158, { fill: 'accent' }),
      text('{time}', 24, 77, 38, 158),
      ...location(378, 38, 21, 149),
      text('{remaining}', 378, 76, 27, 170, { align: 'right', weight: 'semi' }),
    ],
  },
  compactProgress: {
    width: 518,
    height: 100,
    radius: 30,
    background: 'surface',
    elements: [
      text('{prayer}', 28, 37, 24, 202, { fill: 'accent' }),
      text('{time}', 27, 70, 34, 221),
      ...location(490, 36, 20, 169),
      text('{remaining}', 490, 69, 26, 206, { align: 'right', weight: 'semi' }),
      progress(31, 84, 456),
    ],
  },
  strip: {
    width: 626,
    height: 94,
    radius: 28,
    background: 'surface',
    elements: [...strip(10, 74, 12, 499, 21, 27), ...location(602, 54, 17, 65)],
  },
  small: {
    width: 224,
    height: 202,
    radius: 30,
    background: 'surface',
    elements: [
      icon('moon', 23, 18, 23),
      ...location(201, 37, 16, 125),
      text('{prayer}', 23, 81, 27, 177, { fill: 'accent' }),
      text('{time}', 21, 126, 47, 182),
      progress(24, 148, 176),
      text('{remaining}', 24, 179, 23, 177, { weight: 'semi', fill: 'muted' }),
    ],
  },
  mini: {
    width: 72,
    height: 72,
    radius: 23,
    background: 'surface',
    elements: [
      text('{prayer}', 36, 26, 15, 53, { align: 'center', fill: 'accent' }),
      text('{clock}', 36, 48, 22, 59, { align: 'center' }),
      text('{clockNote}', 36, 61, 11, 51, { align: 'center', weight: 'semi', fill: 'muted' }),
    ],
  },
  list: {
    width: 228,
    height: 232,
    radius: 28,
    background: 'surface',
    elements: [...brand(20, 31, 16), ...location(207, 30, 14, 76), ...rows(46, 35, 228, 20)],
  },
};
const palettes = {
  dark: {
    ink: '#F0F6FA',
    muted: '#ADC2CE',
    location: '#BED2DB',
    accent: '#81DFD6',
    track: '#354F5F',
    selected: '#22434D',
    surface: ['#111E2B', '#19313F'],
    moon: ['#B5F2E8', '#78D6D4'],
  },
  light: {
    ink: '#172F3F',
    muted: '#496475',
    location: '#426573',
    accent: '#056F71',
    track: '#CADEE1',
    selected: '#D0ECEA',
    surface: ['#F9FCFC', '#E9F2F5'],
    moon: ['#239E9C', '#146A7B'],
  },
};
// Icons are paths on a 32-unit square, so they stay identical in SVG and Canvas.
const icons = {
  moon: { d: crescentPath(16, 16, 15), fill: 1 },
  pin: {
    d: 'M16 1C4 1 3 13 8 20L16 31 24 20C29 13 28 1 16 1ZM16 7A5 5 0 1 1 16 17A5 5 0 1 1 16 7Z',
    fill: 1,
  },
};
const metrics = {
  bold: widgetFontMetrics('assets/widgets/Manrope-ExtraBold.ttf'),
  semi: widgetFontMetrics('assets/widgets/Manrope-Bold.ttf'),
};
writeFileSync(
  'assets/widgets/designs.json',
  JSON.stringify({ designs, palettes, icons, metrics }, null, 2) + '\n',
);

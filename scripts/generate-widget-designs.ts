import { writeFileSync } from 'node:fs';
import { crescentPath } from '../src/components/brand/crescentPath';
import { widgetFontMetrics } from './widget-font-metrics';

// Coordinates follow the supplied widget artwork. Android and the preview renderer read this file.
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
): Element => ({ type: 'rect', x, y, width, height, radius: 0, fill: 'divider', ...extra });
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
function rows(
  top: number,
  rowHeight: number,
  width: number,
  fontSize: number,
  tall = false,
): Element[] {
  return fields.flatMap((field, i) => {
    const y = top + i * rowHeight;
    return [
      rect(tall ? 20 : 10, y + 2, width - (tall ? 40 : 20), rowHeight - 3, {
        radius: 11,
        fill: 'selected',
        stroke: 'selectedBorder',
        when: field,
      }),
      rect(16, y, width - 32, 0.7),
      text(
        labels[i]!,
        tall ? 36 : 24,
        y + rowHeight / 2 + fontSize * 0.36,
        fontSize,
        width * 0.43,
        {
          weight: 'semi',
        },
      ),
      text(
        `{${field}}`,
        width - (tall ? 36 : 20),
        y + rowHeight / 2 + fontSize * 0.36,
        fontSize,
        width * 0.35,
        {
          align: 'right',
        },
      ),
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
  return fields.flatMap((field, i) => {
    const cell = width / 5;
    const x = start + i * cell;
    return [
      rect(x + 3, top + 3, cell - 6, height - 6, {
        radius: 13,
        fill: 'selected',
        stroke: 'selectedBorder',
        when: field,
      }),
      text(labels[i]!, x + cell / 2, top + height * 0.38, labelSize, cell - 10, {
        align: 'center',
        weight: 'semi',
      }),
      text(`{${field}}`, x + cell / 2, top + height * 0.82, timeSize, cell - 10, {
        align: 'center',
      }),
      ...(timeSize === 26
        ? [
            {
              type: 'circle',
              x: x + cell / 2 - labels[i]!.length * labelSize * 0.28 - 10,
              y: top + height * 0.38 - 6,
              radius: 6,
              fill: 'accent',
              when: field,
            },
          ]
        : []),
    ];
  });
}
const designs = {
  large: {
    width: 610,
    height: 374,
    radius: 34,
    background: 'blue',
    elements: [
      { type: 'path', d: 'M350 0C372 87 478 126 610 106L610 0Z', fill: 'sky', stroke: 'orbit' },
      icon('moon', 436, 45, 47),
      ...brand(36, 39, 25),
      ...location(575, 38, 22, 200),
      text('{date}', 40, 76, 22, 400, { weight: 'semi', fill: 'muted' }),
      text('{prayer}', 44, 158, 60, 260),
      text('{time}', 44, 213, 60, 260),
      text('{remaining}', 570, 196, 60, 262, { align: 'right' }),
      progress(44, 241, 524),
      rect(30, 270, 550, 1),
      ...strip(279, 75, 24, 562, 20, 26),
    ],
  },
  compact: {
    width: 476,
    height: 96,
    radius: 28,
    background: 'blue',
    elements: [
      icon('moon', 28, 27, 36),
      rect(78, 20, 1, 55),
      text('{prayer}', 99, 44, 36, 123),
      text('{time}', 99, 75, 32, 125),
      rect(224, 22, 1, 52),
      text('{remaining}', 320, 58, 34, 174, { align: 'center' }),
      ...location(452, 30, 17, 90),
    ],
  },
  compactProgress: {
    width: 610,
    height: 90,
    radius: 27,
    background: 'navy',
    elements: [
      icon('moon', 24, 24, 39),
      rect(76, 19, 1, 52),
      text('{prayer}', 96, 38, 34, 105),
      text('{time}', 96, 69, 30, 105),
      rect(206, 19, 1, 52),
      progress(230, 45, 157),
      text('{remaining}', 406, 54, 27, 100),
      ...location(588, 48, 16, 62),
    ],
  },
  small: {
    width: 224,
    height: 200,
    radius: 28,
    background: 'navy',
    elements: [
      icon('moon', 27, 14, 32),
      ...location(201, 35, 18, 130),
      text('{prayer}', 28, 80, 34, 168),
      text('{time}', 28, 115, 38, 168),
      progress(28, 139, 171),
      text('{remaining}', 28, 176, 26, 171),
    ],
  },
  vertical: {
    width: 304,
    height: 572,
    radius: 32,
    background: 'blue',
    elements: [
      ...brand(28, 43, 23),
      ...location(278, 42, 20, 86),
      text('{date}', 31, 76, 19, 245, { weight: 'semi', fill: 'muted' }),
      icon('moon', 230, 77, 44),
      {
        type: 'path',
        d: 'M0 151Q77 114 154 161L159 161 159 139 162 127 165 139 165 162 184 169 187 169 187 122 190 110 193 122 193 172 209 177Q208 162 227 153L227 147 229 153Q249 161 248 178L256 181 256 166 259 158 262 166 262 183 272 186 272 174 275 166 278 174 278 188 288 191 288 185Q296 173 304 185L304 225Q214 216 143 177Q70 148 0 171Z',
        fill: 'silhouette',
      },
      {
        type: 'path',
        d: 'M0 145Q91 115 167 170T304 200L304 572 0 572Z',
        fill: 'wave',
        stroke: 'orbit',
      },
      text('{prayer}', 35, 180, 48, 232),
      text('{time}', 35, 225, 48, 232),
      text('{remaining}', 39, 277, 30, 228),
      progress(35, 305, 235),
      ...rows(330, 45, 304, 20, true),
    ],
  },
  strip: {
    width: 626,
    height: 74,
    radius: 22,
    background: 'navy',
    elements: [
      icon('moon', 21, 19, 37),
      ...strip(6, 62, 61, 483, 16, 22),
      ...[1, 2, 3, 4].map((i) => rect(61 + i * 96.6, 22, 0.8, 34)),
      ...location(606, 43, 16, 67),
    ],
  },
  list: {
    width: 228,
    height: 262,
    radius: 22,
    background: 'navy',
    elements: [...brand(15, 32, 16), ...location(211, 30, 13, 78), ...rows(51, 39, 228, 17)],
  },
};
const palettes = {
  dark: {
    ink: '#FFFFFF',
    muted: '#D2E9FF',
    location: '#FFFFFF',
    divider: '#5077AA',
    accent: '#00E5F2',
    track: '#5C8BD0',
    selectedBorder: '#00E4F5',
    orbit: '#20C7E1',
    sky: '#0088C8',
    silhouette: '#004383',
    wave: ['#001447', '#073C90'],
    blue: ['#001B4C', '#033DAA', '#086EBB'],
    navy: ['#061629', '#082E57', '#07508B'],
    selected: ['#00758B', '#078AC0'],
    moon: ['#FFFFFF', '#A6E9FF', '#24ACE8'],
  },
  light: {
    ink: '#112854',
    muted: '#36567D',
    location: '#075BA4',
    divider: '#B6CBE5',
    accent: '#00DAED',
    track: '#C4D9F4',
    selectedBorder: '#8ADFFF',
    orbit: '#D5EDFC',
    sky: '#EDF7FF',
    silhouette: '#C5E4F5',
    wave: '#E8F3FF',
    blue: ['#FFFFFF', '#F5F9FF', '#E2EDFF'],
    navy: ['#FFFFFF', '#F5F9FF', '#E2EDFF'],
    selected: ['#D7F4FF', '#ABE7FF'],
    moon: ['#00E2F5', '#00B4FF', '#005BFF'],
  },
};
// Icons are paths on a 32-unit square, so they stay identical in SVG and Canvas.
const icons = {
  moon: { d: crescentPath(16, 16, 15), fill: 1 },
  moonOutline: { d: crescentPath(16, 16, 15), fill: 0 },
  pin: {
    d: 'M16 1C4 1 3 13 8 20L16 31 24 20C29 13 28 1 16 1ZM16 7A5 5 0 1 1 16 17A5 5 0 1 1 16 7Z',
    fill: 1,
  },
  sun: {
    d: 'M22.5 16A6.5 6.5 0 1 1 9.5 16A6.5 6.5 0 1 1 22.5 16M16 1V5M16 27V31M1 16H5M27 16H31M5.4 5.4 8.2 8.2M23.8 23.8 26.6 26.6M5.4 26.6 8.2 23.8M23.8 8.2 26.6 5.4',
    fill: 0,
  },
  sunrise: {
    d: 'M1 25H31M5 29H27M8 22A8 8 0 0 1 24 22M16 3V8M3 11 7 15M25 15 29 11M1 20H5M27 20H31M12 5 16 1 20 5',
    fill: 0,
  },
  sunset: {
    d: 'M1 25H31M5 29H27M8 22A8 8 0 0 1 24 22M16 1V8M3 11 7 15M25 15 29 11M1 20H5M27 20H31M12 4 16 8 20 4',
    fill: 0,
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

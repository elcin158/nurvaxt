import artwork from '../../../assets/widgets/designs.json';
import type { WidgetTheme, WidgetVariant } from './domain';

export type WidgetElement = {
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  size?: number;
  maxWidth?: number;
  value?: string;
  fill?: string;
  stroke?: string;
  d?: string;
  name?: string;
  weight?: string;
  align?: string;
  when?: string;
  pin?: number;
};
export type WidgetArtworkData = {
  values: Record<string, string>;
  selected: string | null;
  progress: number | null;
};
export const widgetDesigns = artwork.designs;
export const widgetIcons = artwork.icons;
export const widgetPalettes = artwork.palettes;
export function visibleElements(variant: WidgetVariant, data: WidgetArtworkData): WidgetElement[] {
  return (widgetDesigns[variant].elements as WidgetElement[]).filter(
    (element) =>
      (!element.when || element.when === data.selected) &&
      (element.type !== 'progress' || data.progress !== null),
  );
}
export function resolveWidgetText(value: string, data: WidgetArtworkData): string {
  return value.replace(/\{(\w+)\}/g, (_, key: string) => data.values[key] ?? '—');
}
// Both renderers fit small hosts and long 12-hour labels without changing the layout.
export function widgetTextWidth(text: string, size: number, weight = 'bold'): number {
  const metrics = artwork.metrics[weight === 'semi' ? 'semi' : 'bold'] as Record<string, number>;
  return [...text].reduce((total, char) => total + (metrics[char] ?? 0.62), 0) * size;
}
export function fittedTextSize(text: string, size: number, width: number, weight = 'bold'): number {
  return Math.min(size, width / Math.max(1, widgetTextWidth(text, 1, weight)));
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!,
  );

/** The same artwork supplies the gallery, launcher thumbnails and exported review sheet. */
export function widgetSvg(
  variant: WidgetVariant,
  theme: WidgetTheme,
  data: WidgetArtworkData,
): string {
  const design = widgetDesigns[variant];
  const prefix = `widget-${variant}-${theme}-`;
  const palette = widgetPalettes[theme] as Record<string, string | string[]>;
  const fill = (key = 'ink') =>
    Array.isArray(palette[key]) ? `url(#${prefix}${key})` : (palette[key] ?? key);
  const defs = Object.entries(palette)
    .filter(([, value]) => Array.isArray(value))
    .map(
      ([key, colors]) =>
        `<linearGradient id="${prefix}${key}" x1="0" y1="${key === 'moon' ? 0 : 1}" x2="1" y2="${key === 'moon' ? 1 : 0}">${(colors as string[]).map((color, index, all) => `<stop offset="${index / (all.length - 1)}" stop-color="${color}"/>`).join('')}</linearGradient>`,
    )
    .join('');
  const pathIcon = (name: string, x: number, y: number, size: number, color: string) => {
    const shape = widgetIcons[name as keyof typeof widgetIcons];
    return `<path transform="translate(${x} ${y}) scale(${size / 32})" d="${shape.d}" fill="${shape.fill ? fill(color) : 'none'}" fill-rule="evenodd" stroke="${shape.fill ? 'none' : fill(color)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const elements = visibleElements(variant, data)
    .map((element) => {
      const { x = 0, y = 0, width = 0, height = 0, size = 0, radius = 0 } = element;
      if (element.type === 'rect')
        return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill(element.fill)}" stroke="${element.stroke ? fill(element.stroke) : 'none'}"/>`;
      if (element.type === 'path')
        return `<path d="${element.d}" fill="${fill(element.fill)}" stroke="${element.stroke ? fill(element.stroke) : 'none'}" stroke-width="0.6"/>`;
      if (element.type === 'circle')
        return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill(element.fill)}"/>`;
      if (element.type === 'icon') return pathIcon(element.name!, x, y, size, element.fill!);
      if (element.type === 'progress') {
        const end = x + 7 + (width - 14) * Math.max(0, Math.min(1, data.progress!));
        return `<rect x="${x}" y="${y - 4.5}" width="${width}" height="9" rx="4.5" fill="${fill('track')}"/><rect x="${x}" y="${y - 4.5}" width="${end - x}" height="9" rx="4.5" fill="${fill('accent')}"/><circle cx="${end}" cy="${y}" r="7" fill="#FFFFFF"/>`;
      }
      if (element.type === 'text') {
        const value = resolveWidgetText(element.value!, data);
        const fontSize = fittedTextSize(value, size, element.maxWidth!, element.weight);
        const text = `<text x="${x}" y="${y}" font-family="${element.weight === 'semi' ? 'Manrope_700Bold' : 'Manrope_800ExtraBold'}" font-size="${fontSize}" font-weight="${element.weight === 'semi' ? 700 : 800}" text-anchor="${element.align === 'right' ? 'end' : element.align === 'center' ? 'middle' : 'start'}" fill="${fill(element.fill)}">${escape(value)}</text>`;
        return element.pin
          ? pathIcon(
              'pin',
              x - widgetTextWidth(value, fontSize, element.weight) - fontSize * 1.05,
              y - fontSize * 0.85,
              fontSize * 0.8,
              'location',
            ) + text
          : text;
      }
      return '';
    })
    .join('');
  const glow =
    theme === 'dark' ? `<rect width="100%" height="100%" fill="url(#${prefix}glow)"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${design.width}" height="${design.height}" viewBox="0 0 ${design.width} ${design.height}"><defs>${defs}<radialGradient id="${prefix}glow" cx="${design.width}" cy="0" r="${Math.min(design.width * 0.85, design.height * 1.6)}" gradientUnits="userSpaceOnUse"><stop stop-color="#00D4EA" stop-opacity="0.95"/><stop offset="0.55" stop-color="#007CF0" stop-opacity="0.35"/><stop offset="1" stop-color="#007CF0" stop-opacity="0"/></radialGradient><clipPath id="${prefix}clip"><rect x="0.75" y="0.75" width="${design.width - 1.5}" height="${design.height - 1.5}" rx="${design.radius}"/></clipPath></defs><g clip-path="url(#${prefix}clip)"><rect width="100%" height="100%" fill="${fill(design.background)}"/>${glow}${elements}</g><rect x="0.75" y="0.75" width="${design.width - 1.5}" height="${design.height - 1.5}" rx="${design.radius}" fill="none" stroke="${theme === 'dark' ? '#56D9FF' : '#FFFFFF'}" stroke-width="1.5"/></svg>`;
}

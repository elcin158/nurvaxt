import { readFileSync } from 'node:fs';

/** Read bundled TrueType advances so SVG text fitting uses the actual widget font. */
export function widgetFontMetrics(path: string): Record<string, number> {
  const font = readFileSync(path);
  const tables: Record<string, number> = {};
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const offset = 12 + i * 16;
    tables[font.toString('ascii', offset, offset + 4)] = font.readUInt32BE(offset + 8);
  }
  const cmap = tables.cmap!;
  let format4 = 0;
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
    const offset = cmap + font.readUInt32BE(cmap + 4 + i * 8 + 4);
    if (font.readUInt16BE(offset) === 4) format4 = offset;
  }
  if (!format4) throw new Error('Widget font must contain a Unicode format-4 cmap');
  const count = font.readUInt16BE(format4 + 6) / 2;
  const ends = format4 + 14;
  const starts = ends + count * 2 + 2;
  const deltas = starts + count * 2;
  const ranges = deltas + count * 2;
  const units = font.readUInt16BE(tables.head! + 18);
  const metricsCount = font.readUInt16BE(tables.hhea! + 34);
  const result: Record<string, number> = {};
  for (let code = 32; code <= 600; code++) {
    let glyph = 0;
    for (let i = 0; i < count; i++) {
      if (code > font.readUInt16BE(ends + i * 2)) continue;
      const start = font.readUInt16BE(starts + i * 2);
      if (code < start) break;
      const delta = font.readInt16BE(deltas + i * 2);
      const range = font.readUInt16BE(ranges + i * 2);
      glyph = range ? font.readUInt16BE(ranges + i * 2 + range + (code - start) * 2) : code;
      if (glyph) glyph = (glyph + delta) & 0xffff;
      break;
    }
    result[String.fromCharCode(code)] =
      font.readUInt16BE(tables.hmtx! + Math.min(glyph, metricsCount - 1) * 4) / units;
  }
  return result;
}

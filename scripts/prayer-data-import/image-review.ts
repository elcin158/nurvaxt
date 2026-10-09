import { z } from 'zod';
import { DateTime } from 'luxon';
const checksum = z.string().regex(/^[a-f0-9]{64}$/);
export const candidateSchema = z.object({
  schemaVersion: z.literal(1),
  sourceReference: z.string(),
  sourceChecksum: checksum,
  atlasReference: z.string(),
  atlasChecksum: checksum,
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  locationId: z.string(),
  rows: z.array(
    z.object({
      date: z.string(),
      ocr: z.array(z.string()),
      template: z.array(z.string()).length(10),
      scores: z
        .array(z.object({ distance: z.number().nonnegative(), margin: z.number().nonnegative() }))
        .length(10),
    }),
  ),
});
export type ImageCandidate = z.infer<typeof candidateSchema>;
export const auditSchema = z.object({
  sourceChecksum: checksum,
  headerVerified: z.literal(true),
  reviewer: z.string().min(1),
  reviewedAt: z.string().min(1),
  resolutions: z.array(
    z.object({
      day: z.number().int().min(1).max(31),
      column: z.number().int().min(0).max(9),
      value: z.string().min(1),
      note: z.string().min(1),
      doubleChecked: z.boolean().optional(),
    }),
  ),
});
export function candidateIssues(candidate: ImageCandidate) {
  return candidate.rows.flatMap((row, index) =>
    row.template.flatMap((text, column) => {
      const reasons = [];
      if (row.ocr.length !== 10 || row.ocr[column] !== text)
        reasons.push('OCR/template disagreement');
      const score = row.scores[column]!;
      if (score.distance > 0.13 || score.margin < 0.045) reasons.push('Uncertain glyph');
      if (column === 0 ? text !== String(index + 1) : !/^([01]\d|2[0-3]):[0-5]\d$/.test(text))
        reasons.push('Invalid date/time');
      return reasons.length
        ? [
            {
              day: index + 1,
              column,
              ocr: row.ocr[column] ?? null,
              template: text,
              reason: reasons.join('; '),
            },
          ]
        : [];
    }),
  );
}
export function resolveCandidate(input: unknown, auditInput: unknown) {
  const candidate = candidateSchema.parse(input);
  const audit = auditSchema.parse(auditInput);
  if (candidate.sourceChecksum !== audit.sourceChecksum)
    throw new Error('Image audit source checksum mismatch');
  const expectedDays = DateTime.utc(candidate.year, candidate.month).daysInMonth;
  if (candidate.rows.length !== expectedDays)
    throw new Error('Image review must cover a complete month');
  const resolutions = new Map(
    audit.resolutions.map((cell) => [`${cell.day}:${cell.column}`, cell]),
  );
  if (resolutions.size !== audit.resolutions.length) throw new Error('Duplicate image audit cell');
  if (audit.resolutions.some((cell) => cell.day > candidate.rows.length))
    throw new Error('Image audit day outside source');
  for (const issue of candidateIssues(candidate))
    if (!resolutions.has(`${issue.day}:${issue.column}`))
      throw new Error(`Unresolved image cell ${issue.day}:${issue.column}`);
  const rows = candidate.rows.map((row, index) => {
    const day = index + 1;
    const date = `${candidate.year}-${String(candidate.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (row.date !== date) throw new Error('Image review date/row mismatch');
    for (let column = 0; column < 10; column++) {
      const resolution = resolutions.get(`${day}:${column}`);
      if (
        resolution &&
        resolution.value !== row.template[column] &&
        resolution.value !== row.ocr[column] &&
        !resolution.doubleChecked
      )
        throw new Error(`Third-reading correction needs a second visual check: ${day}:${column}`);
    }
    const values = row.template.map(
      (text, column) => resolutions.get(`${day}:${column}`)?.value ?? text,
    );
    if (values[0] !== String(day)) throw new Error('Image day column mismatch');
    return { date, values: values.slice(1) };
  });
  return { candidate, audit, rows };
}

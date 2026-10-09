import { z } from 'zod';
import { PRAYER_FIELDS } from '../constants/prayers';
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const prayerDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locationId: z.string().min(1),
  imsak: timeSchema.nullable(),
  fajr: timeSchema.nullable(),
  sunrise: timeSchema.nullable(),
  dhuhr: timeSchema.nullable(),
  asr: timeSchema.nullable(),
  sunset: timeSchema.nullable(),
  maghrib: timeSchema.nullable(),
  isha: timeSchema.nullable(),
  midnight: timeSchema.nullable(),
  sourceId: z.string().min(1),
  sourceVersion: z.string().min(1),
  verified: z.boolean(),
});
export type PrayerDay = z.infer<typeof prayerDaySchema>;
export const locationSchema = z.object({
  id: z.string().regex(/^qmi-\d+$/),
  name: z.string(),
  sourceName: z.string(),
  sourceValue: z.string().regex(/^\d+$/),
});
export type Location = z.infer<typeof locationSchema>;
export const datasetSchema = z.object({
  schemaVersion: z.literal(1),
  year: z.number().int(),
  version: z.string(),
  sourceId: z.literal('qmi'),
  sourceUrl: z.string().url(),
  publicationDate: z.string().nullable(),
  importedAt: z.string(),
  verifiedAt: z.string(),
  verification: z.enum(['visual-transcription', 'visual-and-glyph-crosscheck']),
  reviewer: z.string(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  sources: z.array(
    z.object({
      reference: z.string(),
      url: z.string().url(),
      checksum: z.string(),
      locationId: z.string(),
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }),
  ),
  supportedLocations: z.array(z.string()),
  dateRange: z.object({ start: z.string(), end: z.string() }),
  rawLabels: z.record(z.enum(PRAYER_FIELDS), z.string()),
  records: z.array(prayerDaySchema),
});
export type Dataset = z.infer<typeof datasetSchema>;
export type DatasetSummary = Pick<
  Dataset,
  'year' | 'version' | 'verifiedAt' | 'checksum' | 'supportedLocations' | 'dateRange'
> & { recordCount: number };

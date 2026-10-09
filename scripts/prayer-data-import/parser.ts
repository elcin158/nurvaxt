import { load } from 'cheerio';
import { z } from 'zod';
import { PRAYER_FIELDS, type PrayerField } from '../../src/constants/prayers';
import { locationSchema, timeSchema } from '../../src/types/data';
export const SOURCE_URL = 'https://www.qafqazislam.com/index.php?lang=az&sectionid=123';
export const RAW_LABELS: Record<PrayerField, string> = {
  imsak: 'İmsak vaxtı',
  fajr: 'Sübh azanı',
  sunrise: 'Gün çıxır',
  dhuhr: 'Zöhr azanı',
  asr: 'Əsr azanı',
  sunset: 'Gün batır',
  maghrib: 'Məğrib azanı',
  isha: 'İşa azanı',
  midnight: 'Gecə yarısı',
};
const normalize = (v: string) => v.replace(/\s+/g, ' ').trim();
export function parseSourcePage(html: string) {
  const $ = load(html);
  const form = $('form')
    .filter((_, node) => $(node).find('select[name=weher]').length > 0)
    .first();
  if (!form.length) throw new Error('QMİ city form was not found; do not guess an endpoint.');
  const locations = form
    .find('select[name=weher] option')
    .map((_, node) => {
      const value = $(node).attr('value')!;
      const name = normalize($(node).text());
      return locationSchema.parse({
        id: `qmi-${value}`,
        sourceValue: value,
        sourceName: name,
        name: name === 'Masalli' ? 'Masallı' : name,
      });
    })
    .get();
  const years = form
    .find('select[name=il] option')
    .map((_, node) => Number($(node).attr('value')))
    .get();
  const months = form
    .find('select[name=ay] option')
    .map((_, node) => Number($(node).attr('value')))
    .get();
  const action = new URL(form.attr('action') ?? SOURCE_URL, SOURCE_URL).href;
  const submitFields: Record<string, string> = {};
  form.find('input[type=hidden][name]').each((_, node) => {
    submitFields[$(node).attr('name')!] = $(node).attr('value') ?? '';
  });
  const submit = form.find('button[type=submit][name], input[type=submit][name]').first();
  if (submit.length) submitFields[submit.attr('name')!] = submit.attr('value') ?? '';
  const image = form.find('img').first().attr('src');
  const imageUrl = image ? new URL(image, SOURCE_URL).href : null;
  const printHref = form.find('a[href*="print_teqvim.php"]').first().attr('href');
  const printUrl = printHref ? new URL(printHref, SOURCE_URL) : null;
  if (
    new URL(action).hostname !== 'www.qafqazislam.com' ||
    (imageUrl && new URL(imageUrl).hostname !== 'www.qafqazislam.com') ||
    (printUrl && printUrl.hostname !== 'www.qafqazislam.com')
  )
    throw new Error('Unexpected source origin.');
  const selection = {
    city: form.find('select[name=weher] option[selected]').attr('value'),
    year: Number(form.find('select[name=il] option[selected]').attr('value')),
    month: Number(form.find('select[name=ay] option[selected]').attr('value')),
  };
  // The live CMS keeps the current-month selector highlighted even after a different POST.
  // Its actual print link identifies the published city/year/month returned by that request.
  const publicationSelection = printUrl
    ? {
        city: printUrl.searchParams.get('sheher') ?? undefined,
        year: Number(printUrl.searchParams.get('il')),
        month: Number(printUrl.searchParams.get('ay')),
      }
    : null;
  return {
    locations,
    years,
    months,
    action,
    imageUrl,
    selection,
    publicationSelection,
    submitFields,
  };
}
// Future HTML tables are supported only when their labels exactly match a known mapping.
export function parseHtmlTable(html: string) {
  const $ = load(html);
  const table = $('table').first();
  if (!table.length)
    throw new Error('No HTML timetable found. The current source uses JPG images.');
  const headers = table
    .find('tr')
    .first()
    .find('th,td')
    .map((_, n) => normalize($(n).text()))
    .get();
  if (headers[0] !== 'Ayın günləri') throw new Error('Unknown day column.');
  const fields = headers.slice(1).map((label) => {
    const field = PRAYER_FIELDS.find((f) => RAW_LABELS[f] === label);
    if (!field) throw new Error(`Unknown source column: ${label}`);
    return field;
  });
  if (new Set(fields).size !== fields.length) throw new Error('Duplicate source columns.');
  return table
    .find('tr')
    .slice(1)
    .map((_, row) => {
      const cells = $(row)
        .find('td')
        .map((__, cell) => normalize($(cell).text()))
        .get();
      if (cells.length !== headers.length) throw new Error('Column count mismatch.');
      const day = z.number().int().min(1).max(31).parse(Number(cells[0]));
      const times: Record<string, string | null> = Object.fromEntries(
        PRAYER_FIELDS.map((f) => [f, null]),
      );
      fields.forEach((field, index) => {
        times[field] = timeSchema.parse(cells[index + 1]);
      });
      return { day, times };
    })
    .get();
}
export const reviewSchema = z
  .object({
    sourceReference: z.string(),
    sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    method: z.enum(['visual-transcription', 'ocr-glyph-crosscheck']),
    evidenceReference: z.string().optional(),
    evidenceChecksum: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    reviewer: z.string().min(1),
    reviewedAt: z.string(),
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    locationId: z.string(),
    labels: z.array(z.string()).length(9),
    rows: z.array(z.object({ date: z.string(), values: z.array(timeSchema.nullable()).length(9) })),
  })
  .refine(
    (review) =>
      review.method !== 'ocr-glyph-crosscheck' ||
      Boolean(review.evidenceReference && review.evidenceChecksum),
    'Image crosscheck evidence is required',
  );
export function normalizeReview(input: unknown, version: string) {
  const review = reviewSchema.parse(input);
  review.labels.forEach((label, index) => {
    if (label !== RAW_LABELS[PRAYER_FIELDS[index]!])
      throw new Error(`Unknown source column: ${label}`);
  });
  return {
    review,
    records: review.rows.map((row) => ({
      date: row.date,
      locationId: review.locationId,
      ...Object.fromEntries(PRAYER_FIELDS.map((f, i) => [f, row.values[i]])),
      sourceId: 'qmi',
      sourceVersion: version,
      verified: true,
    })),
  };
}

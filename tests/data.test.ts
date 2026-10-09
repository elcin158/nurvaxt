import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { validateDataset } from '../src/services/validation';
import {
  normalizeReview,
  parseHtmlTable,
  parseSourcePage,
} from '../scripts/prayer-data-import/parser';
import dataset from '../data/verified/2026.json';
import review from '../data/review/baku-2026-10.review.json';
import locations from '../data/locations.json';
const ids = locations.map((l) => l.id);
test('published source investigation discovers 74 regions and image retrieval', () => {
  const source = parseSourcePage(readFileSync('data/sources/qmi-page-2026-10-08.html', 'utf8'));
  expect(source.locations).toHaveLength(74);
  expect(source.years).toContain(2026);
  expect(source.imageUrl).toBe('https://www.qafqazislam.com/teqvim/2026/Baki/10.jpg');
  expect(source.locations.find((l) => l.id === 'qmi-1')?.name).toBe('Bakı');
  expect(source.submitFields).toEqual({ ara: '' });
});
test('every packaged time matches its reviewed source and checksums', () => {
  const reviews = readdirSync('data/review')
    .filter((path) => path.endsWith('.review.json'))
    .map(
      (path) =>
        normalizeReview(JSON.parse(readFileSync(`data/review/${path}`, 'utf8')), dataset.version)
          .review,
    )
    .filter((item) => dataset.sources.some((source) => source.reference === item.sourceReference));
  const records = reviews
    .flatMap((item) => normalizeReview(item, dataset.version).records)
    .sort((a, b) => a.locationId.localeCompare(b.locationId) || a.date.localeCompare(b.date));
  expect(records).toEqual(dataset.records);
  const digest = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
  reviews.forEach((item) => {
    expect(digest(readFileSync(item.sourceReference))).toBe(item.sourceChecksum);
  });
  expect(digest(JSON.stringify(dataset.records))).toBe(dataset.checksum);
});
test('publication metadata identifies November despite stale current-month selector', () => {
  const source = parseSourcePage(readFileSync('data/sources/2026/qmi-1/11.html', 'utf8'));
  expect(source.selection.month).toBe(10);
  expect(source.publicationSelection).toEqual({ city: '1', year: 2026, month: 11 });
  expect(source.imageUrl).toBe('https://www.qafqazislam.com/teqvim/2026/Baki/11.jpg');
  expect(source.years).not.toContain(2027);
});
test('reports incomplete annual coverage honestly', () => {
  const report = validateDataset(dataset, ids);
  expect(report.accepted).toBe(6808);
  expect(report.errors).toEqual([]);
  expect(report.annualComplete).toBe(false);
  expect(report.missing).toBe(20202);
});
test('all 74 official regions contain all 92 requested days and three original monthly sources', () => {
  expect(dataset.supportedLocations.slice().sort()).toEqual(ids.slice().sort());
  expect(dataset.sources).toHaveLength(222);
  expect(dataset.dateRange).toEqual({ start: '2026-10-01', end: '2026-12-31' });
  for (const id of ids) {
    const records = dataset.records.filter((record) => record.locationId === id);
    expect(records).toHaveLength(92);
    expect(records[0]?.date).toBe('2026-10-01');
    expect(records.at(-1)?.date).toBe('2026-12-31');
    expect(
      dataset.sources
        .filter((source) => source.locationId === id)
        .map((source) => source.month)
        .sort(),
    ).toEqual([10, 11, 12]);
    expect(records.every((record) => Object.values(record).every((value) => value !== null))).toBe(
      true,
    );
  }
  const abseron = dataset.records.find(
    (record) => record.locationId === 'qmi-79' && record.date === '2026-10-02',
  );
  const baku = dataset.records.find(
    (record) => record.locationId === 'qmi-1' && record.date === '2026-10-02',
  );
  expect(abseron?.dhuhr).toBe('12:29');
  expect(baku?.dhuhr).toBe('12:30');
});
test.each(['2026-02-29', '2026-04-31', '2026-13-01'])('rejects invalid actual date %s', (date) => {
  const copy = structuredClone(dataset);
  copy.records[0]!.date = date;
  expect(validateDataset(copy, ids).errors.length).toBeGreaterThan(0);
});
test('duplicates, unsupported locations, unverified rows and mapping errors fail', () => {
  const copy = structuredClone(dataset);
  copy.records.push(copy.records[0]!);
  copy.records[1]!.locationId = 'fake';
  copy.records[2]!.verified = false;
  copy.records[3]!.sourceVersion = 'wrong';
  expect(validateDataset(copy, ids).rejected).toBe(4);
});
test('unusual times are review warnings rather than silently rejected', () => {
  const copy = structuredClone(dataset);
  copy.records[1]!.asr = '15:00';
  const report = validateDataset(copy, ids);
  expect(report.warnings.some((w) => w.includes('asr'))).toBe(true);
  expect(report.rejected).toBe(0);
});
test('invalid time, unknown source labels and image-as-table fail closed', () => {
  const copy = structuredClone(dataset);
  copy.records[0]!.imsak = '25:61';
  expect(validateDataset(copy, ids).errors.length).toBeGreaterThan(0);
  expect(() =>
    normalizeReview({ ...review, labels: ['Unknown', ...review.labels.slice(1)] }, 'v1'),
  ).toThrow('Unknown source column');
  expect(() => parseHtmlTable('<img src="source.jpg"/>')).toThrow('No HTML timetable');
  expect(() =>
    parseHtmlTable('<table><tr><th>Ayın günləri</th><th>Unknown</th></tr></table>'),
  ).toThrow('Unknown source column');
});

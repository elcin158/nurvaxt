import { parseArgs } from 'node:util';
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  access,
  readdir,
  open,
  unlink,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DateTime } from 'luxon';
import { datasetSchema, type Dataset } from '../../src/types/data';
import { validateDataset } from '../../src/services/validation';
import { parseSourcePage, normalizeReview, RAW_LABELS, SOURCE_URL } from './parser';
import { resolveCandidate } from './image-review';
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    year: { type: 'string', default: '2026' },
    acquire: { type: 'boolean' },
    locations: { type: 'string' },
    months: { type: 'string' },
    resume: { type: 'boolean' },
    review: { type: 'string', multiple: true },
    'review-dir': { type: 'string' },
    'complete-scope': { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    version: { type: 'string' },
    replace: { type: 'boolean' },
  },
});
const year = Number(values.year);
if (!Number.isInteger(year) || year < 2025 || year > 2100)
  throw new Error('Provide a valid --year.');
const root = process.cwd();
const datasetPath = join(root, `data/verified/${year}.json`);
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
async function json(path: string) {
  return JSON.parse(await readFile(path, 'utf8'));
}
async function atomicWrite(path: string, content: string | Buffer) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  await writeFile(temp, content);
  await rename(temp, path);
}
async function readValidated(target = year) {
  const data = datasetSchema.parse(await json(join(root, `data/verified/${target}.json`)));
  const locations: { id: string }[] = await json(join(root, 'data/locations.json'));
  const report = validateDataset(
    data,
    locations.map((l) => l.id),
  );
  if (hash(JSON.stringify(data.records)) !== data.checksum)
    report.errors.push('Dataset checksum mismatch.');
  for (const source of data.sources) {
    const bytes = await readFile(resolve(root, source.reference));
    if (hash(bytes) !== source.checksum)
      report.errors.push(`${source.reference}: source integrity failed`);
  }
  await atomicWrite(
    join(root, `data/verified/${target}.report.json`),
    JSON.stringify(report, null, 2) + '\n',
  );
  if (report.errors.length || report.rejected) throw new Error(JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        year: target,
        ...report,
        dates: { start: report.dates[0], end: report.dates.at(-1), count: report.dates.length },
      },
      null,
      2,
    ),
  );
  return data;
}
// QMİ robots.txt specifies a 40-second crawl delay. Do not parallelize acquisition.
let lastRequest = 0;
const requestMarker = join(root, 'data/sources/.qmi-last-request');
async function fetchSource(url: string, init?: RequestInit) {
  try {
    const previous = Number(await readFile(requestMarker, 'utf8'));
    if (Number.isFinite(previous)) lastRequest = Math.max(lastRequest, previous);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const wait = Math.max(0, 40_000 - (Date.now() - lastRequest));
  if (wait) await new Promise((done) => setTimeout(done, wait));
  lastRequest = Date.now();
  await atomicWrite(requestMarker, String(lastRequest));
  const response = await fetch(url, {
    ...init,
    headers: { 'User-Agent': 'NurVaxt-source-review/1.0', ...init?.headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`QMİ returned ${response.status}: ${url}`);
  return response;
}
async function acquireSources() {
  async function sourceHtml(path: string, url: string, init?: RequestInit) {
    if (values.resume) {
      try {
        return await readFile(path, 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    const html = await (await fetchSource(url, init)).text();
    await atomicWrite(path, html);
    return html;
  }
  const html = await sourceHtml(join(root, `data/sources/qmi-page-${year}.html`), SOURCE_URL);
  const page = parseSourcePage(html);
  if (!page.years.includes(year)) throw new Error(`${year} is not offered by QMİ.`);
  await atomicWrite(join(root, `data/sources/qmi-page-${year}.html`), html);
  await atomicWrite(
    join(root, 'data/locations.json'),
    JSON.stringify(page.locations, null, 2) + '\n',
  );
  const ids = values.locations?.split(',');
  if (ids?.some((id) => !page.locations.some((l) => l.id === id)))
    throw new Error('Unknown --locations value; use qmi-* identifiers.');
  const months = values.months ? values.months.split(',').map(Number) : page.months;
  if (
    !months.length ||
    months.some((month) => !Number.isInteger(month) || !page.months.includes(month))
  )
    throw new Error('Unknown --months value; use offered month numbers, for example 11,12.');
  const sourceMap = new Map<string, Dataset['sources'][number]>();
  // Preserve references for already verified months when acquiring only part of a year.
  for (const path of [datasetPath, join(root, `data/sources/${year}.manifest.json`)]) {
    try {
      const stored = await json(path);
      const sources: Dataset['sources'] = Array.isArray(stored) ? stored : stored.sources;
      for (const source of sources)
        if (source.year === year) sourceMap.set(source.reference, source);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  for (const city of page.locations.filter((l) => !ids || ids.includes(l.id)))
    for (const month of [...new Set(months)]) {
      if (values.resume) {
        const archived = [...sourceMap.values()].find(
          (source) => source.locationId === city.id && source.month === month,
        );
        if (archived) {
          try {
            const bytes = await readFile(join(root, archived.reference));
            if (hash(bytes) !== archived.checksum || bytes[0] !== 0xff || bytes[1] !== 0xd8)
              throw new Error(`Archived source integrity failed: ${archived.reference}`);
            console.log(`Reused ${city.name}/${month}; archived source checksum verified.`);
            continue;
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
        }
      }
      const params = new URLSearchParams({
        ...page.submitFields,
        weher: city.sourceValue,
        il: String(year),
        ay: String(month),
      });
      const selected = await sourceHtml(
        join(root, `data/sources/${year}/${city.id}/${month}.html`),
        page.action,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params,
        },
      );
      const result = parseSourcePage(selected);
      const published = result.publicationSelection ?? result.selection;
      await atomicWrite(join(root, `data/sources/${year}/${city.id}/${month}.html`), selected);
      if (
        published.city !== city.sourceValue ||
        published.year !== year ||
        published.month !== month
      )
        throw new Error(
          `QMİ published selection does not match the request (${JSON.stringify(published)}); refusing to associate the wrong source. Response HTML was archived for investigation.`,
        );
      if (!result.imageUrl) throw new Error(`Missing published image for ${city.name}/${month}`);
      const image = Buffer.from(await (await fetchSource(result.imageUrl)).arrayBuffer());
      if (image[0] !== 0xff || image[1] !== 0xd8)
        throw new Error('Expected JPEG source, received another format.');
      const reference = `data/sources/${year}/${city.id}/${month}.jpg`;
      await atomicWrite(join(root, reference), image);
      await atomicWrite(join(root, `data/sources/${year}/${city.id}/${month}.html`), selected);
      sourceMap.set(reference, {
        reference,
        url: result.imageUrl,
        checksum: hash(image),
        locationId: city.id,
        year,
        month,
      });
      await atomicWrite(
        join(root, `data/sources/${year}.manifest.json`),
        JSON.stringify([...sourceMap.values()], null, 2) + '\n',
      );
      console.log(`Archived ${city.name}/${month}; awaiting visual review. No records promoted.`);
    }
}
async function acquire() {
  const lockPath = join(root, 'data/sources/.qmi-acquisition.lock');
  await mkdir(dirname(lockPath), { recursive: true });
  let lock;
  try {
    lock = await open(lockPath, 'wx');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      throw new Error('Another acquisition holds the QMİ lock. Do not run parallel downloads.');
    throw error;
  }
  try {
    await lock.writeFile(String(process.pid));
    await acquireSources();
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}
async function importReviews() {
  if (values.review && values['review-dir'])
    throw new Error('Use --review or --review-dir, not both.');
  const reviews = values['review-dir']
    ? (await readdir(resolve(root, values['review-dir'])))
        .filter((name) => name.endsWith('.review.json'))
        .sort()
        .map((name) => join(values['review-dir']!, name))
    : (values.review ?? [`data/review/baku-${year}-10.review.json`]);
  if (!reviews.length) throw new Error('No reviewed source files found.');
  const version = values.version ?? `${year}.10-baku.1`;
  const locations: { id: string }[] = await json(join(root, 'data/locations.json'));
  const manifestPath = join(root, `data/sources/${year}.manifest.json`);
  let manifest: Dataset['sources'];
  try {
    manifest = await json(manifestPath);
  } catch {
    manifest = (await json(datasetPath)).sources;
  }
  const normalized = await Promise.all(
    reviews.map(async (path) => {
      const result = normalizeReview(await json(resolve(root, path)), version);
      if (result.review.method === 'ocr-glyph-crosscheck') {
        const evidenceBytes = await readFile(resolve(root, result.review.evidenceReference!));
        if (hash(evidenceBytes) !== result.review.evidenceChecksum)
          throw new Error('Image crosscheck evidence checksum mismatch');
        const evidence = JSON.parse(evidenceBytes.toString('utf8'));
        const resolved = resolveCandidate(evidence.candidate, evidence.audit);
        if (
          hash(await readFile(resolve(root, resolved.candidate.atlasReference))) !==
          resolved.candidate.atlasChecksum
        )
          throw new Error('Image glyph atlas checksum mismatch');
        if (
          resolved.candidate.sourceReference !== result.review.sourceReference ||
          resolved.candidate.sourceChecksum !== result.review.sourceChecksum ||
          resolved.candidate.locationId !== result.review.locationId ||
          resolved.candidate.year !== year ||
          resolved.candidate.month !== result.review.month ||
          JSON.stringify(resolved.rows) !== JSON.stringify(result.review.rows)
        )
          throw new Error('Image crosscheck evidence does not match review');
      }
      if (result.review.year !== year) throw new Error('Review year mismatch.');
      if (
        hash(await readFile(resolve(root, result.review.sourceReference))) !==
        result.review.sourceChecksum
      )
        throw new Error('Source differs from reviewed file.');
      if (result.review.rows.length !== DateTime.local(year, result.review.month).daysInMonth)
        throw new Error('Review must cover a complete published month.');
      if (
        result.review.rows.some(
          (r) => !r.date.startsWith(`${year}-${String(result.review.month).padStart(2, '0')}-`),
        )
      )
        throw new Error('Review month mismatch.');
      return result;
    }),
  );
  const records = normalized
    .flatMap((n) => n.records)
    .sort((a, b) => a.locationId.localeCompare(b.locationId) || a.date.localeCompare(b.date));
  if (values['complete-scope']) {
    const months = values.months?.split(',').map(Number);
    if (
      !months?.length ||
      months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)
    )
      throw new Error('--complete-scope requires valid --months.');
    const ids = values.locations?.split(',') ?? locations.map((location) => location.id);
    if (ids.some((id) => !locations.some((location) => location.id === id)))
      throw new Error('Unknown scope location.');
    const keys = new Set(records.map((record) => `${record.locationId}:${record.date}`));
    for (const id of ids)
      for (const month of new Set(months)) {
        const days = DateTime.utc(year, month).daysInMonth!;
        for (let day = 1; day <= days; day++) {
          const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!keys.has(`${id}:${date}`))
            throw new Error(`Requested coverage is incomplete: ${id}/${date}`);
        }
      }
  }
  const dates = records.map((r) => r.date).sort();
  const sources = normalized.map((n) => {
    const source = manifest.find(
      (s) =>
        s.reference === n.review.sourceReference &&
        s.checksum === n.review.sourceChecksum &&
        s.locationId === n.review.locationId &&
        s.year === year &&
        s.month === n.review.month,
    );
    if (!source) throw new Error('No matching acquired source reference.');
    return source;
  });
  const data = datasetSchema.parse({
    schemaVersion: 1,
    year,
    version,
    sourceId: 'qmi',
    sourceUrl: SOURCE_URL,
    publicationDate: null,
    importedAt: new Date().toISOString(),
    verifiedAt: normalized
      .map((n) => n.review.reviewedAt)
      .sort()
      .at(-1),
    verification: normalized.some((n) => n.review.method === 'ocr-glyph-crosscheck')
      ? 'visual-and-glyph-crosscheck'
      : 'visual-transcription',
    reviewer: [...new Set(normalized.map((n) => n.review.reviewer))].join('; '),
    checksum: hash(JSON.stringify(records)),
    sources,
    supportedLocations: [...new Set(records.map((r) => r.locationId))],
    dateRange: { start: dates[0], end: dates.at(-1) },
    rawLabels: RAW_LABELS,
    records,
  });
  const report = validateDataset(
    data,
    locations.map((l) => l.id),
  );
  if (report.errors.length || report.rejected) throw new Error(JSON.stringify(report));
  if (values['dry-run']) {
    console.log(
      JSON.stringify(
        {
          reviewedSources: sources.length,
          accepted: report.accepted,
          rejected: report.rejected,
          errors: report.errors,
          warnings: report.warnings,
          regions: data.supportedLocations.length,
          dateRange: data.dateRange,
          annualComplete: report.annualComplete,
        },
        null,
        2,
      ),
    );
    return;
  }
  try {
    await access(datasetPath);
    if (!values.replace)
      throw new Error(
        'Dataset already exists. Use an explicit --replace after reviewing coverage; back up the prior version.',
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (values.replace) {
    try {
      const previous = await readFile(datasetPath);
      await atomicWrite(
        join(root, `data/verified/archive/${year}-${hash(previous).slice(0, 12)}.json`),
        previous,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  await atomicWrite(datasetPath, JSON.stringify(data, null, 2) + '\n');
  await readValidated();
}
// One read-only database for all verified years, shipped as an app asset. The bundle id
// changes whenever any year's records change, so installed apps replace their copy on update.
async function buildDB() {
  const years = (await readdir(join(root, 'data/verified')))
    .filter((f) => /^\d{4}\.json$/.test(f))
    .map((f) => Number(f.slice(0, 4)))
    .sort();
  const datasets: Dataset[] = [];
  for (const y of years) datasets.push(await readValidated(y));
  const bundle = hash(JSON.stringify(datasets.map((d) => [d.year, d.checksum]))).slice(0, 16);
  const result = spawnSync(
    'python3',
    [
      join(root, 'scripts/prayer-data-import/build_sqlite.py'),
      join(root, 'data/verified/prayer-times.db'),
      bundle,
      ...years.map((y) => join(root, `data/verified/${y}.json`)),
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) throw new Error('SQLite generation failed. Python 3 is required.');
  const summaries = datasets.map((d) => ({
    year: d.year,
    version: d.version,
    verifiedAt: d.verifiedAt,
    checksum: d.checksum,
    supportedLocations: d.supportedLocations,
    dateRange: d.dateRange,
    recordCount: d.records.length,
  }));
  await atomicWrite(
    join(root, 'src/database/bundled.ts'),
    `// Generated by prayer:build-db.\nimport type { DatasetSummary } from '../types/data';\nexport const PRAYER_DB_BUNDLE = '${bundle}';\nexport const prayerDatabase: number = require('../../data/verified/prayer-times.db');\nexport const bundledDatasets: DatasetSummary[] = ${JSON.stringify(summaries)};\nexport const currentDataset = bundledDatasets[bundledDatasets.length - 1]!;\n`,
  );
  await atomicWrite(
    join(root, 'src/database/webRecords.ts'),
    `// Generated by prayer:build-db. Browser preview only; native reads prayer-times.db.\n${years.map((y) => `import year${y} from '../../data/verified/${y}.json';`).join('\n')}\nexport const webDatasets: unknown[] = [${years.map((y) => `year${y}`).join(', ')}];\n`,
  );
}
async function main() {
  switch (positionals[0]) {
    case 'import':
      return values.acquire ? acquire() : importReviews();
    case 'validate':
      return readValidated();
    case 'build-db':
      return buildDB();
    default:
      throw new Error('Use import, validate, or build-db.');
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

import { createWorker, PSM } from 'tesseract.js';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import type { Dataset } from '../../src/types/data';
import { candidateIssues, type ImageCandidate } from './image-review';

async function main() {
  const { values } = parseArgs({
    options: {
      watch: { type: 'boolean' },
      force: { type: 'boolean' },
      locations: { type: 'string' },
      months: { type: 'string' },
    },
  });
  const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
  const atlasReference = 'data/review/evidence/plain-table-atlas.json';
  const atlasChecksum = digest(await readFile(atlasReference));
  const worker = await createWorker('eng', 1, { cachePath: '/tmp/nurvaxt-ocr-cache' });
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789:',
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    preserve_interword_spaces: '1',
  });
  await mkdir('data/candidates', { recursive: true });
  const attempted = new Set<string>();
  try {
    do {
      const sources: Dataset['sources'] = JSON.parse(
        await readFile('data/sources/2026.manifest.json', 'utf8'),
      );
      for (const source of sources) {
        if (values.locations && !values.locations.split(',').includes(source.locationId)) continue;
        if (values.months && !values.months.split(',').map(Number).includes(source.month)) continue;
        if (source.locationId === 'qmi-1' || attempted.has(source.reference)) continue;
        const prefix = `data/candidates/${source.locationId}-${source.year}-${source.month}`;
        attempted.add(source.reference);
        try {
          if (!values.force) {
            try {
              const existing = JSON.parse(await readFile(`${prefix}.candidate.json`, 'utf8'));
              if (
                existing.sourceChecksum === source.checksum &&
                existing.atlasChecksum === atlasChecksum
              )
                continue;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            }
          }
          if (digest(await readFile(source.reference)) !== source.checksum)
            throw new Error('Source checksum mismatch');
          const extracted = spawnSync(
            'python3',
            [
              'scripts/prayer-data-import/image_grid.py',
              'extract',
              '--source',
              source.reference,
              '--year',
              String(source.year),
              '--month',
              String(source.month),
              '--target',
              prefix,
            ],
            { encoding: 'utf8' },
          );
          if (extracted.status !== 0) throw new Error(extracted.stderr);
          const recognized = await worker.recognize(`${prefix}.png`);
          const ocr = recognized.data.text
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => line.trim().split(/\s+/));
          type Glyph = { value: string; distance: number; margin: number };
          const classified: { rows: { text: string; glyphs: Glyph[] }[][] } = JSON.parse(
            await readFile(`${prefix}.glyphs.json`, 'utf8'),
          );
          const rows = classified.rows.map((cells, index) => ({
            date: `${source.year}-${String(source.month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
            ocr: ocr[index] ?? [],
            template: cells.map((cell) => cell.text),
            scores: cells.map((cell) => ({
              distance: Math.max(...cell.glyphs.map((glyph) => glyph.distance)),
              margin: Math.min(...cell.glyphs.map((glyph) => glyph.margin)),
            })),
          }));
          const candidate: ImageCandidate = {
            schemaVersion: 1,
            sourceReference: source.reference,
            sourceChecksum: source.checksum,
            year: source.year,
            month: source.month,
            locationId: source.locationId,
            atlasReference,
            atlasChecksum,
            rows,
          };
          const issues = candidateIssues(candidate);
          if (ocr.length !== rows.length)
            throw new Error(`OCR row count mismatch: ${ocr.length}/${rows.length}`);
          await writeFile(
            `${prefix}.candidate.json`,
            JSON.stringify(
              {
                ...candidate,
                generatedAt: new Date().toISOString(),
                ocrConfidence: recognized.data.confidence,
                issues,
              },
              null,
              2,
            ) + '\n',
          );
          console.log(
            `Candidate ${source.locationId}/${source.month}: ${rows.length * 9} cells, ${issues.length} require visual review; not promoted.`,
          );
        } catch (error) {
          console.error(`Candidate ${source.reference} failed: ${String(error)}`);
        }
      }
      if (values.watch) await new Promise((done) => setTimeout(done, 20_000));
    } while (values.watch);
  } finally {
    await worker.terminate();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { resolveCandidate } from './image-review';
import { RAW_LABELS, reviewSchema } from './parser';
import { PRAYER_FIELDS } from '../../src/constants/prayers';
async function main() {
  const { values } = parseArgs({
    options: { candidate: { type: 'string' }, audit: { type: 'string' } },
  });
  if (!values.candidate || !values.audit) throw new Error('Provide --candidate and --audit');
  const candidateInput = JSON.parse(await readFile(values.candidate, 'utf8'));
  const auditInput = JSON.parse(await readFile(values.audit, 'utf8'));
  const { candidate, audit, rows } = resolveCandidate(candidateInput, auditInput);
  const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
  if (hash(await readFile(candidate.sourceReference)) !== candidate.sourceChecksum)
    throw new Error('Source checksum mismatch');
  if (hash(await readFile(candidate.atlasReference)) !== candidate.atlasChecksum)
    throw new Error('Atlas checksum mismatch');
  const stem = `${candidate.locationId}-${candidate.year}-${candidate.month}`;
  const evidenceReference = `data/review/evidence/${stem}.image-check.json`;
  const evidence = Buffer.from(JSON.stringify({ candidate, audit }) + '\n');
  await mkdir(dirname(evidenceReference), { recursive: true });
  const review = reviewSchema.parse({
    sourceReference: candidate.sourceReference,
    sourceChecksum: candidate.sourceChecksum,
    method: 'ocr-glyph-crosscheck',
    reviewer: audit.reviewer,
    reviewedAt: audit.reviewedAt,
    evidenceReference,
    evidenceChecksum: hash(evidence),
    year: candidate.year,
    month: candidate.month,
    locationId: candidate.locationId,
    labels: PRAYER_FIELDS.map((field) => RAW_LABELS[field]),
    rows,
  });
  const reviewPath = `data/review/${stem}.review.json`;
  try {
    await readFile(reviewPath);
    throw new Error(`Review already exists: ${reviewPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await writeFile(evidenceReference, evidence);
  await writeFile(reviewPath, JSON.stringify(review, null, 2) + '\n');
  console.log(
    `Reviewed ${stem}: ${rows.length * 9} source-image time cells; ${audit.resolutions.length} visual resolutions.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

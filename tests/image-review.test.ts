import { readFileSync } from 'node:fs';
import { candidateIssues, resolveCandidate } from '../scripts/prayer-data-import/image-review';
import { normalizeReview } from '../scripts/prayer-data-import/parser';
const evidence = JSON.parse(
  readFileSync('data/review/evidence/qmi-4-2026-11.image-check.json', 'utf8'),
);
test('independent source-image comparison detects an OCR column shift and requires every cell resolution', () => {
  expect(candidateIssues(evidence.candidate)).toHaveLength(10);
  expect(candidateIssues(evidence.candidate).every((issue) => issue.day === 2)).toBe(true);
  expect(() =>
    resolveCandidate(evidence.candidate, { ...evidence.audit, resolutions: [] }),
  ).toThrow('Unresolved image cell');
  const { rows } = resolveCandidate(evidence.candidate, evidence.audit);
  expect(rows[1]).toEqual({
    date: '2026-11-02',
    values: ['05:55', '06:00', '07:21', '12:34', '16:06', '17:47', '18:01', '19:03', '23:54'],
  });
});
test('source identity, calendar rows, duplicate resolutions and missing header audit fail closed', () => {
  expect(() =>
    resolveCandidate(evidence.candidate, { ...evidence.audit, sourceChecksum: '0'.repeat(64) }),
  ).toThrow('checksum');
  expect(() =>
    resolveCandidate(evidence.candidate, { ...evidence.audit, headerVerified: false }),
  ).toThrow();
  expect(() =>
    resolveCandidate(evidence.candidate, {
      ...evidence.audit,
      resolutions: [...evidence.audit.resolutions, evidence.audit.resolutions[0]],
    }),
  ).toThrow('Duplicate');
  const missing = structuredClone(evidence.candidate);
  missing.rows.pop();
  expect(() => resolveCandidate(missing, evidence.audit)).toThrow('complete month');
  const shifted = structuredClone(evidence.candidate);
  shifted.rows[0].date = '2026-11-02';
  expect(() => resolveCandidate(shifted, evidence.audit)).toThrow('date/row');
});
test('image crosscheck review cannot claim verified values without evidence metadata', () => {
  const review = JSON.parse(readFileSync('data/review/qmi-4-2026-11.review.json', 'utf8'));
  const { evidenceReference: _reference, evidenceChecksum: _checksum, ...unproved } = review;
  expect(() => normalizeReview(unproved, 'test')).toThrow('evidence');
});
test('a correction differing from both independent readings requires a second visual check', () => {
  const audit = structuredClone(evidence.audit);
  audit.resolutions.find((cell: { column: number }) => cell.column === 1).value = '18:33';
  expect(() => resolveCandidate(evidence.candidate, audit)).toThrow('second visual check');
});

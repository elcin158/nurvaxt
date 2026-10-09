# Import and verification workflow

Acquisition → preserved source → image transcription/crosscheck → explicit review
→ normalization → Zod/semantic checks → versioned JSON/report → atomic SQLite artifact
→ transactional mobile installation.

QMİ publishes JPEG tables. Acquisition records the actual POST response, its print-link
city/year/month, the discovered image URL and the image SHA-256. It does not calculate
times, derive city offsets or copy a nearby city's records. A stale month selector is
accepted only when the print-link publication metadata matches the requested month.

## Acquisition and restart

```bash
npm run prayer:import -- --year 2026 --acquire --months 10,11,12 --resume
```

Omit `--locations` for all 74 official options, or pass a comma-separated list of `qmi-*`
IDs. The year and months must actually be offered by the official form. Requests are
sequential, with the observed 40-second crawl delay persisted between runs. An exclusive
acquisition lock prevents concurrent jobs. `--resume` reuses archived HTML and previously
manifested images only after checking their SHA-256; it also preserves the original Bakı
seed reference. A source mismatch stops acquisition. A job interrupted with SIGKILL may
leave a lock: first confirm that its recorded process is no longer running before removing
that lock. Do not remove a live job's lock or lower the crawl delay.

## Two supported image-review methods

`visual-transcription` records a complete monthly table whose individual source cells were
visually transcribed/checked. The original Bakı reviews and the Abşeron October atlas review
use this method.

`ocr-glyph-crosscheck` uses Tesseract 7 as one transcription and a separate pixel-template
classifier as the second. The classifier's fixed, preserved atlas was labeled from the
visually checked Abşeron October image; it compares actual digit shapes, never neighboring
days or other cities' time values. Grid detection checks the 12 published columns and the
actual monthly row count. Gregorian day values are independently read as well. Unknown
image geometry is rejected. The decorative Bakı images retain their original visual reviews.

```bash
# Install the offline image tools if missing; Tesseract's model is cached under /tmp.
python3 -m pip install -r scripts/prayer-data-import/requirements.txt
npm run prayer:candidates -- --watch
python3 scripts/prayer-data-import/audit_montage.py --prefix /tmp/month-audit \
  data/candidates/qmi-4-2026-11.candidate.json
```

Candidates are ignored working files and are never promoted automatically. Inspect the
original header's city, year, month and all nine prayer labels. Inspect every flagged source
cell: disagreements, invalid dates/times, glyph mean absolute distance above 0.13, or a
nearest-class margin below 0.045. Record each actual value, including the Gregorian day
column when flagged, in an explicit audit JSON:

```json
{
  "sourceChecksum": "<original image SHA-256>",
  "headerVerified": true,
  "reviewer": "<person or agent who actually inspected the images>",
  "reviewedAt": "2026-10-09",
  "resolutions": [{ "day": 2, "column": 0, "value": "2", "note": "Read from original source" }]
}
```

Audit columns are 0 = Gregorian day, then 1–9 = the published time fields in order.
Do not mark a header or cell checked before inspecting it. A correction differing from both
readings requires a second visual check and an explicit `doubleChecked: true` on that cell. An empty resolutions array is
valid only when both readings agree and every glyph passes the thresholds. If a scan/font
cannot be independently checked, use manual double entry; unresolved differences block import.

```bash
npm run prayer:review -- \
  --candidate data/candidates/qmi-4-2026-11.candidate.json \
  --audit data/candidates/qmi-4-2026-11.audit.json
```

This creates the monthly review and a compact evidence file containing both readings,
per-cell classifier scores, explicit visual resolutions and source/atlas checksums. It refuses
to overwrite an existing review. The importer verifies the evidence hash, atlas hash, all
resolved values, source identity and exact row agreement. The dataset labels mixed reviews
`visual-and-glyph-crosscheck`; it does not claim that every cell was manually transcribed.
This is source-image verification, not independent religious-authority sign-off.

## Normalize and publish the offline package

Every review preserves the nine raw source labels separately from normalized field names.
Times may be null only if absent from the original; the present tables provide all nine.
Dates, leap years, month lengths, time syntax, duplicate keys, known city IDs, source/version
mapping, source hashes, complete months and metadata ranges are checked. Adjacent-day jumps
over ten minutes produce review warnings using circular time differences around midnight.
Annual coverage is reported separately from a complete requested quarterly scope.
Review warning cells against the original image too. A confirmed irregularity in the
publication is preserved and recorded in `data/review/source-anomalies.json`; it is not
silently smoothed to neighboring days. Kəngərli's 23 October midnight value is one such
confirmed source irregularity.

```bash
npm run prayer:import -- --year 2026 --review-dir data/review \
  --months 10,11,12 --complete-scope --version 2026.10-12-all-regions.3 --dry-run
npm run prayer:import -- --year 2026 --review-dir data/review \
  --months 10,11,12 --complete-scope --version 2026.10-12-all-regions.3 --replace
npm run prayer:validate -- --year 2026
npm run prayer:build-db -- --year 2026
```

`--complete-scope` refuses to replace the package while any requested city/day is missing.
Without `--locations`, it requires all official regions. `--dry-run` validates without changing
the packaged dataset. Alternatively pass repeated `--review` paths. `--review-dir` includes
only top-level `.review.json` files; keep it limited to the selected year. Existing year
replacement requires `--replace` and archives the previous JSON by hash. The SQLite builder
checks integrity and publishes all years atomically into `data/verified/prayer-times.db`; it
also regenerates `src/database/bundled.ts`. Run it after every dataset change, before a release
build. The app copies the `.db` asset on first launch and replaces it when the bundle id changes.

For a future year, first confirm it is offered by QMİ; never guess future source paths.
The exact-label HTML table parser remains a tested adapter for a future source format;
the currently observed source is JPEG, not an HTML timetable or PDF.

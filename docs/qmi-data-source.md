# QMİ source investigation — 8 October 2026

Investigated actual responses from
<https://www.qafqazislam.com/index.php?lang=az&sectionid=123>.
Raw evidence is checked in under `data/sources/`.

## Selection and retrieval

The source has an HTML POST form whose action is the same prayer page. Its submit
button is named **ara**, with an empty value; this is included with the submitted fields.
Its selector
names are **weher** (city), **il** (year), and **ay** (month). The misspelling is the
actual form field. There are 74 city/region options, with numeric source identifiers.
The observed years are 2025 and 2026; months are 1–12. `data/locations.json` preserves
all source option labels/values; the display corrects source “Masalli” to “Masallı”.

The current default is Bakı / 2026 / October. The response embeds:

```html
<img src="./teqvim/2026/Baki/10.jpg" width="600" />
```

The observed print link is
<https://www.qafqazislam.com/print_teqvim.php?sheher=1&il=2026&ay=10>.
Its response embeds **the same image**, then invokes printing. It does not provide a
structured table or PDF. No annual PDF or prayer JSON API was discovered. The separate
“RAMAZAN AYININ TƏQVİMİ - 2026” link exists (section 124), but it has not been used to
assert Ramadan dates, iftar semantics or annual prayer coverage.

The downloaded Bakı October, November and December JPEGs are 1200 × 1696 and each
contains a clear monthly table. November and December were retrieved using the actual
POST form and its discovered `11.jpg` / `12.jpg` links. Response HTML and source images
are archived under `data/sources/2026/qmi-1/`; the October seed retains its original path.
The original investigation covered Bakı only. The 9 October extension individually acquires
all official regions for October–December; the source manifest records actual progress. A
selector option does not prove that all requested months return the correct image.

The live CMS leaves October selected in the month control after a November or December
POST. Its print link correctly identifies the returned month, as does the image header.
The importer validates that print-link metadata against the request before archiving
the image. All three source references are preserved in the merged year manifest.
2027 is absent from the official selector as observed on 8 October 2026.

## Column definitions

| Published label | Application field | Interpretation                                 |
| --------------- | ----------------- | ---------------------------------------------- |
| İmsak vaxtı     | imsak             | Separate published time                        |
| Sübh azanı      | fajr              | First of five daily prayers                    |
| Gün çıxır       | sunrise           | Sunrise, outside five-prayer countdown         |
| Zöhr azanı      | dhuhr             | Daily prayer                                   |
| Əsr azanı       | asr               | Daily prayer                                   |
| Gün batır       | sunset            | Distinct from Məğrib                           |
| Məğrib azanı    | maghrib           | Daily prayer, no assumed iftar definition      |
| İşa azanı       | isha              | Daily prayer                                   |
| Gecə yarısı     | midnight          | Displayed source time; not the rollover prayer |

The image also includes Gregorian day, Hijri day and weekday columns. Prayer values
are `HH:mm`. Image Hijri names and holiday annotations are preserved in the raw image,
but are not promoted to an official religious calendar database. The optional UI Hijri
date is an explicitly calculated civil calendar.

Sample visually cross-checked source rows:

| Date       | İmsak | Sübh  | Günçıxma | Zöhr  | Əsr   | Günbatımı | Məğrib | İşa   | Gecəyarısı |
| ---------- | ----- | ----- | -------- | ----- | ----- | --------- | ------ | ----- | ---------- |
| 2026-10-01 | 05:12 | 05:17 | 06:37    | 12:30 | 16:37 | 18:22     | 18:36  | 19:37 | 23:50      |
| 2026-10-08 | 05:20 | 05:25 | 06:44    | 12:28 | 16:27 | 18:11     | 18:25  | 19:25 | 23:48      |
| 2026-10-31 | 05:43 | 05:48 | 07:10    | 12:24 | 15:57 | 17:38     | 17:53  | 18:54 | 23:44      |
| 2026-11-01 | 05:44 | 05:49 | 07:11    | 12:24 | 15:56 | 17:37     | 17:52  | 18:53 | 23:43      |
| 2026-12-01 | 06:14 | 06:19 | 07:45    | 12:30 | 15:34 | 17:15     | 17:30  | 18:35 | 23:47      |
| 2026-12-31 | 06:31 | 06:36 | 08:03    | 12:43 | 15:43 | 17:23     | 17:39  | 18:45 | 00:00      |

All 92 rows / 828 time cells were visually transcribed from the three source images by Codex.
The review sidecar and normalized rows are cross-checked automatically, and source and
dataset SHA-256 checksums are checked. This is **not an independent human religious
authority sign-off**; a second human review is required before public release. No OCR was used for those original Bakı reviews. Publication date is unknown, stored as null. Acquisition and
review dates are recorded separately.

## All-region extension — 9 October 2026

The requested scope is all 74 official selector entries for October, November and December:
222 monthly images, 6,808 daily rows and 61,272 published time cells. Acquisition follows the
same actual POST/print-link/image checks and 40-second delay. A checksum-checked resume and
exclusive acquisition lock avoid duplicate traffic and parallel jobs.

The inspected other-region images use plain, 800-pixel-wide tables with slightly differing
row heights. A fully visually checked Abşeron October review labels the fixed digit atlas.
A Tesseract transcription is independently compared with pixel-template readings; source
identity/column headers and every disagreement or uncertain glyph are visually inspected.
An explicit audit is required before a monthly review can be created. A correction differing
from both readings needs a second visual check. Records are never filled from other cities:
Abşeron and Bakı differ at Zöhr on 2 October (12:29 versus 12:30).

Evidence preserves both readings, glyph scores, manual resolutions and source/atlas hashes.
Mixed packages use `visual-and-glyph-crosscheck`, not a claim of manual transcription of all
cells. See the exact process and thresholds in [data import](data-import.md). All-region
replacement requires every requested city/day to be present. The complete requested quarter
passed this gate on 9 October; annual coverage remains incomplete because January–September
were not requested.

The 23 October Kəngərli source prints midnight as **01:04**, while 22 and 24 October
print **00:04**. Both the full original and enlarged rows were inspected. The published
01:04 is preserved, rather than silently calculated or changed. Its one-hour jump therefore
remains a validation warning; `data/review/source-anomalies.json` records the source hash
and explicit follow-up review. This field does not drive the five-prayer countdown.

## Access and redistribution

The observed robots.txt allows crawling, disallows `/AdminIstration/`, and requests
`Crawl-delay: 40`. Its raw bytes are archived. Initial format investigation made a small
number of requests before this delay was discovered; the acquisition CLI subsequently
enforces 40 seconds between requests, including between CLI invocations, and does not
parallelize or bypass restrictions.

The site footer identifies QMİ copyright. No open-data redistribution license was found.
Public redistribution permission and source-use terms require confirmation with QMİ.
Attribution alone is not evidence of permission. NurVaxt is independent and does not
claim official affiliation.

## Coverage

Currently packaged: all 74 regions, three months per region, 6,808 records and 61,272 time
cells (1 October–31 December), verified against 222 separately archived monthly sources.
Expected full 2026 selector coverage: 74 × 365 = 27,010 region/day records. Missing: 20,202.
Full annual readiness is false.
The 2026 selector establishes availability of a year option, not complete annual verification.

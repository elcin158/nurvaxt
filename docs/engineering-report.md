# NurVaxt engineering report — 8 October 2026

The actual Expo/React Native application and native Android integration are implemented.
This is a tested development baseline, not a public production release. No store submission,
physical-device verification or iOS build is claimed.

## Implemented

- Strict TypeScript, Expo SDK 55 / React Native 0.83.10 / React 19.2 with development builds
  and generated Android/iOS projects; original vector identity, icon and splash assets.
- Azerbaijani onboarding, home/countdown, independent day navigation, calendar/list,
  searchable 74-region selector, persisted preferences, light/dark/system themes and settings.
- Nine distinct official fields, five-prayer next-event logic, Asia/Baku absolute timestamps,
  sparse-data rollover handling, optional calculated civil Hijri date and accessible controls.
- Validated offline native SQLite, schema versioning, integrity checks, year transactions,
  source metadata and explicit unavailable states. Browser preview uses a separate repository.
- Actual QMİ form/image acquisition, archived evidence, review sidecars, strict source mapping,
  checksums, completeness/anomaly reports, protected year packages and SQLite generation.
- Multiple offsets for each prayer, separate İmsak events, quiet hours, sound and vibration;
  durable Android AlarmManager plan, 32 registered timestamps, boot/time-change receivers,
  permission/exact-access UX, and native diagnostics/test notification.
- iOS Expo/UN local notifications with a 60-request rolling bound and reconciliation. Native
  iOS compilation and delivery remain unverified in this Ubuntu environment.

## Executed verification

| Command/check                                                                              | Result                                                                                                   |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `npm install` / Expo SDK-compatible dependency installation                                | Installed; lockfile included                                                                             |
| `npm run typecheck`                                                                        | Passed                                                                                                   |
| `npm run lint`                                                                             | Passed without warnings                                                                                  |
| `npm run test`                                                                             | **35 tests, 6 suites passed**                                                                            |
| `npm run format`                                                                           | Passed                                                                                                   |
| Three-review 2026 import (`baku-2026-{10,11,12}.review.json`, version `2026.10-12-baku.2`) | 92 accepted, 0 rejected; previous October package archived by hash                                       |
| `npm run prayer:validate -- --year 2026`                                                   | Passed; incomplete annual coverage reported                                                              |
| `npm run prayer:build-db -- --year 2026`                                                   | SQLite artifact generated; integrity check passed                                                        |
| `npx expo prebuild --no-install`                                                           | Android and iOS source generated                                                                         |
| `npx expo export --platform android`                                                       | Android JS/Hermes bundle exported                                                                        |
| `./gradlew :app:assembleDebug` in `android/`                                               | **BUILD SUCCESSFUL**, native alarm module compiled                                                       |
| `python3 scripts/android-smoke.py --serial emulator-5556 --skip-install`                   | Passed after actual onboarding; verified home opened on API 35 emulator                                  |
| Initial debug emulator SQLite + WAL snapshot                                               | Historical October build: `quick_check=ok`, schema 1, all 31 rows / 279 values equal its bundled records |
| Browser preview at mobile dimensions                                                       | Onboarding, official home, calendar and dark/light settings observed; Azerbaijani date labels verified   |

Tests cover parser/mapping, every review-to-package row, checksums/invalid dates/duplicates,
coverage, neighboring-date warnings, midnight/sparse transitions, countdown, offsets,
quiet hours, stable IDs/deduplication, reconciliation, city changes, settings persistence,
calendar navigation, invalid-update preservation and SQLite integrity/indexed queries.
They do not replace platform lifecycle QA.

`python3 scripts/android-notification-smoke.py --serial emulator-5556 --skip-install --from-settings`
passed on the API 35 emulator. The real native queue held **118 future prayer requests**, with
**32 registered timestamps**. A test event passed through the same AlarmManager/receiver/channel
path and appeared as an Android notification; it was consumed without a remaining duplicate.
The permission/exact grants were supplied through ADB, not verified through permission dialogs.
See `android-notification-result.json` and `screenshots/android-notification.png`.

Background process-death verification remains pending: the attempted harness did not prove
that its test request had entered the durable queue before terminating the app. No successful
background/process-death delivery claim is made. Reboot, Doze and physical-device behavior
also remain unverified. UIAutomator may not reach idle during the live countdown; the verified
notification continuation starts from Ayarlar, and diagnostics refreshes its clock every five seconds.

The initial full Android debug build completed in 20m 30s with all four configured ABIs.
The final native-test integration rebuild completed in 3m 34s, 529 tasks (63 executed).
That debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`, approximately 236 MiB because
it contains development tooling and four ABIs. It is a development build and **requires Metro**;
it is not the signed standalone release delivered below.

## Signed Android release 1.0.1

The local `:app:assembleRelease` build succeeded in **4m 48s**, 836 tasks (697 executed),
with R8 minification/resource shrinking and a dedicated RSA-3072 release signing key.
The delivered APK is `artifacts/nurvaxt-1.0.1-release.apk`, **78,503,174 bytes (74.87 MiB)**,
versionCode **2**, minSdk **24**, targetSdk **36**; it includes arm64-v8a, armeabi-v7a and
x86_64. `apksigner` verified the signature against the local release key; the manifest is
not debuggable and does not request overlay, camera, microphone, storage or location access.
The APK embeds a **3,648,736-byte Hermes/JS bundle**, bundled fonts and the original reminder
tone. Sound bytes were checked even though resource shrinking renames their packaged path.

Actual API 35 emulator verification, with Wi-Fi/mobile data disabled and no ADB reverse mappings:

- Clean install, all four onboarding steps and home/countdown opened without Metro.
- November and December calendars opened with their actual official records.
- 31 December showed all nine fields, including published Gecəyarısı **00:00**.
- January 2027 showed an unavailable state and the actual remaining coverage.
- The native SQLite/WAL snapshot passed `quick_check`; all **92 rows / 828 times** matched
  the bundled dataset and no 2027 rows were fabricated.
- A native test notification passed through the actual AlarmManager queue in the minified
  release; **423 future prayer requests / 32 registered timestamps** remained. Permission
  and exact-alarm grants were supplied through ADB; dialog UX and physical timing remain pending.
- Force-stop followed by a fresh ordinary launch again opened the official home offline;
  this checks cold relaunch, not background or force-stopped notification delivery.

See `android-release-result.json`, `android-release-database-result.json`,
`android-release-notification-result.json` and `artifacts/nurvaxt-1.0.1-release.json`.
The APK SHA-256 is `b70b8a0b7b2865ecfa535f1c6c907536269c996f787b1e5626f00cb48c8dcd77`.
Back up `.signing/` securely and retain the same key for future installed-app updates.

The initial emulator's software graphics process terminated during subsequent builds.
No corresponding NurVaxt fatal exception was observed. Successful startup/database checks
remain recorded, while delivery/lifecycle scenarios require their own evidence in the matrix.
The notification smoke script is emulator-only and grants notification/exact access through
ADB for isolated verification; it cannot establish permission-dialog UX or physical-device behavior.

## Official data coverage

- Official selector: **74 cities/regions**.
- Packaged: **Bakı, 1 October–31 December 2026**, **92 records**, **828 published times**.
- Expected annual city-days: **27,010**; missing/unverified: **26,918**.
- `annualComplete=false`; missing dates/regions never receive calculated replacements.
- Sources are three real QMİ JPGs, visually transcribed and checked against all normalized cells.
  Independent human signoff of every cell is still required before release.
- No publication timestamp or redistribution license was found. Unknown metadata remains
  null; acquisition respects the observed 40-second crawl delay.

November and December were acquired from actual POST responses. The parser now discovers
the `ara` submit field and uses the response print link to validate the returned publication,
because the source CMS leaves the month selector on October. All three source references
survive manifest merging. Specific-month acquisition, resumable response HTML and the
cross-run crawl-delay marker are implemented. Calendar, onboarding, cities and settings
display bundle metadata rather than hardcoded October coverage.

The 2027 year is not offered by QMİ as observed on 8 October. Import/build supports a
separate 2027 bundle when published; current January dates correctly remain unavailable.
See [year rollover](year-rollover.md) for the same-key APK update workflow.

## Remaining release work

1. Obtain QMİ redistribution permission and complete independent transcription review.
   Acquire and verify the remaining official months/regions, preserving source provenance.
2. Run the native matrix on physical Android devices and iOS; verify foreground, background,
   ordinary task removal, reboot, Doze, battery saver, denial/revocation, clock changes,
   midnight and physical-device offline cold launch. Emulator offline cold launch passed.
   iOS indefinite unattended replenishment is unsupported.
3. Review the recorded dependency audit: **40 high, 15 moderate, 0 critical** findings,
   many involving transitive Expo/Metro/Jest tooling. Upgrade compatible dependencies and
   assess shipped exposure; an incompatible `npm audit fix --force` was not applied.
4. Check package/brand availability, Play exact-alarm policy eligibility, final privacy/store
   declarations and a real operator contact. Configure EAS/store credentials; a local APK
   signing identity has been generated and verified, and must be backed up.
5. Measure release cold start, memory, accessibility and notification timing on representative
   small/large devices. Debug Expo overlay tooling is not the intended release permission surface.

Optional GPS, widgets, qibla, azan recordings and automatic Ramadan mode are deferred.
Ramadan dates/iftar conventions must have verified religious-calendar evidence before display.
The app has no account, advertising, analytics, backend, push registration or location tracking.

See [native matrix](native-test-matrix.md), [source evidence](qmi-data-source.md),
[notification limits](notifications.md), [dependency audit](dependency-audit-summary.json)
and [release checklist](release-checklist.md).

## All-region quarter — 9 October 2026

Version 1.0.3 / Android versionCode 4 packages all 74 official regions for 1 October–31
December 2026: 222 monthly originals, 6,808 records and 61,272 published time cells. Four
monthly tables use complete visual reviews; the remaining 218 use independent OCR/glyph
comparison with explicit visual source-header and flagged-cell audits. Original JPEGs,
SHA-256 references and compact audit evidence are preserved. January–September remain
outside the requested scope. Kəngərli's published 23 October midnight value of 01:04 was
checked in the full original and enlarged rows, preserved and documented as a source anomaly.

The complete-scope import, evidence/source checks and SQLite artifact generation passed.
All 49 Jest tests, TypeScript and ESLint passed, including 74-region coverage, city-dependent
prayer selection, notification replacement, 50-row transactional installation and rollback
on a later batch failure. The first new-APK device inspection is reserved for the user's
local test; the earlier emulator QA reports apply to their recorded older versions.

The signed 1.0.3 APK build and vital release lint passed. Its signature matches the preserved
release key, and its embedded Hermes bundle contains the new dataset version and reviewed
record checksum. The delivery APK is `artifacts/nurvaxt-1.0.3-release.apk` (78,891,850 bytes;
SHA-256 `3a3034c4efeacbe82a5dced9a3f6ea0349e3fb2a8afb676b26b4b42b43116872`).
The new APK was not installed for device QA before the user's requested first local inspection.

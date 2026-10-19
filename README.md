# NurVaxt — Namaz Vaxtları

An independent Azerbaijani prayer timetable app. Expo SDK 55, React Native 0.83.10,
React 19.2, strict TypeScript, Expo Router, Zustand, TanStack Query and native SQLite.
All product UI and notification messages are Azerbaijani. No accounts, advertising,
analytics, push service, GPS tracking or runtime QMİ requests. The Qibla compass works from
the selected city; an optional coarse-location origin is the only permission it can ask for.

**Current verified coverage: all 74 official regions, 1 October–31 December 2026.**
The package includes 222 monthly sources, 6,808 daily records and 61,272 published times.
Other dates show an unavailable state. Original visual reviews are combined with independent
OCR/glyph readings and explicit visual audits of source headers and every uncertain cell.
January–September, public-release human review, licensing and broader device QA remain gates.

## Run

Requirements: Node 22, npm, Python 3 (database builder), JDK 17, Android SDK 36,
NDK version requested by the generated Gradle project, and an emulator/device.

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run start
```

In another terminal:

```bash
npm run android:dev
```

`npm run android` also builds and opens Android. `npm run start:clear` clears Metro.
`npm run android:build` compiles the debug APK without opening a device. Configure
`ANDROID_HOME` or an ignored `android/local.properties` with your SDK directory.
Use `adb -s <device> reverse tcp:8081 tcp:8081` when USB debug builds need Metro.
The debug build needs Metro; a release or EAS preview build embeds its JS/assets.

This session's preview runs on port 8088. To reuse it, run
`npx expo start --dev-client --port 8088` and reverse `tcp:8088` for your selected device.

Emulator-only native checks (never target a personal phone):

```bash
npm run android:smoke -- --serial emulator-5556
npm run android:notification-smoke -- --serial emulator-5556
```

For the installed signed release on a disposable rooted emulator, verify the persistent timer,
30/15-minute transitions, ordinary task removal and at-time prayer delivery:

```bash
npm run android:countdown-smoke -- --serial emulator-5556
```

This check temporarily changes only the emulator clock, restores it in `finally`, uses test-only
ADB permission grants and saves `docs/android-countdown-result.json` plus screenshots. It rejects
physical-device serials. Install the current release APK before running it.

Both require the built debug APK, a running emulator and Metro on port 8088. The notification
check applies test-only notification/exact-alarm grants through ADB; it does not verify the
permission-dialog UX. It enables reminders on the disposable emulator, checks the native
bounded prayer plan and delivers a test through the actual AlarmManager queue. Results are
written under `docs/`. The home check currently requires a date within the bundled range.

UIAutomator can fail to idle while the one-second countdown is visible. If that happens,
open **Ayarlar** in the installed emulator app and use the verified continuation:

```bash
npm run android:notification-smoke -- --serial emulator-5556 --skip-install --from-settings
```

Native Android/iOS projects are generated and included. After changing Expo config,
permissions, the alarm module or native dependencies:

```bash
npm run prebuild
npm run android:dev
```

Expo Go does not include `NurvaxtAlarm`; use a development build. Keep reproducible
changes in app.config.ts, plugins and modules, because clean prebuild regenerates native files.

## Official data

```bash
npm run prayer:validate -- --year 2026
npm run prayer:build-db -- --year 2026
npm run prayer:import -- --year 2026 --review-dir data/review \
  --months 10,11,12 --complete-scope --version 2026.10-12-all-regions.3 --dry-run
npm run prayer:import -- --year 2026 --review-dir data/review \
  --months 10,11,12 --complete-scope --version 2026.10-12-all-regions.3 --replace
```

An existing year's JSON is protected unless `--replace` is explicit; replacement archives
the old package by hash. Specify every review file intended for that year's replacement.
The SQLite builder validates every verified year, writes them into one read-only
`data/verified/prayer-times.db` and regenerates `src/database/bundled.ts` (metadata and bundle id).
The `.db` ships as an app asset: native startup copies it on first launch and replaces the copy
whenever an update carries a different bundle id. The JSON stays the reviewed source of truth and
is bundled only for the browser preview.

To archive actual published images, without promoting them to verified records:

```bash
npm run prayer:import -- --year 2026 --acquire --months 10,11,12 --resume
```

Omit `--locations` to traverse the official city selector. The website publishes **JPG
images**, not PDF or HTML prayer rows. Acquisition uses the observed POST form and
discovered image URL, never constructed city paths. It honors the observed 40-second
crawl delay, runs sequentially and saves HTML/image/checksum references. Full acquisition
and visual verification are substantial work. OCR output is a candidate, never verified data.
See [source investigation](docs/qmi-data-source.md) and [import workflow](docs/data-import.md).
The website currently offers 2025 and 2026. See [new-year updates](docs/year-rollover.md)
for adding 2027 when QMİ publishes it; the app does not download new years automatically.

## Product

- Four-step onboarding, searchable 74-region selector and recent selections.
- Today/day navigation, distinct nine source fields, isolated live next-prayer countdown.
- Read-only time rows and one daily share action for all nine times, including hidden rows,
  with the selected city, date, time format and source attribution.
- Missing-data states outside the bundled coverage, with source attribution.
- System/light/dark themes, bundled Manrope fonts, font scaling, screen reader labels.
- Independent multi-reminders for five prayers and İmsak; quiet hours, vibration and tone.
- Default at-time notifications for all five prayers, alongside optional advance reminders.
- Android silent ongoing countdown with numerical status icon; circle at 30 minutes, diamond at 15.
- Safe-area-aware bottom navigation and amber/coral countdown urgency labels.
- Android durable AlarmManager queue, reboot/time-change receivers and user-granted exact access.
- iOS local notifications via Expo/UNUserNotificationCenter, bounded rolling reconciliation.
- Hidden diagnostics: tap version seven times in “NurVaxt haqqında”.
- Optional calculated civil Hijri date with ±2-day adjustment, clearly labeled as calculated.

Ramadan dates and the authoritative iftar definition are not verified; automatic Ramadan
mode and azan recordings are deliberately deferred. No guessed dates or sunset/Maghrib equivalence.

## Builds and checks

Google Play test bundle (version 1.0.8, Android versionCode 10):

```bash
npm run android:bundle
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

The signed upload file is written to `artifacts/nurvaxt-1.0.8-v10.aab`. Release
binaries are not tracked in git; rebuild it with the commands above and compare
the recorded checksum. See `artifacts/nurvaxt-1.0.8-v10.validation.json` for its
signature, checksum, packaged permissions and 16 KB alignment checks. Azerbaijani release notes are in
`artifacts/google-play/release-notes-1.0.8-az.txt`; handover details are in
`artifacts/nurvaxt-1.0.8-README-az.md`. The user uploads the bundle to the existing
Play test track; no Play Console submission was performed by this task.

Local signed release APK (uses the current configured version):

```bash
npm run android:release-key
npm run android:release -- -PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64
python3 scripts/verify-release-apk.py
```

The release embeds JS, fonts and the verified data. The APK is produced at
`android/app/build/outputs/apk/release/app-release.apk`. The delivery copy is
`artifacts/nurvaxt-<version>-release.apk`. This is an APK for installation and testing;
public-store requirements remain in the release checklist.

The previous 1.0.1 API 35 emulator verification passed with Wi-Fi/mobile data disabled and no Metro tunnel:
clean/cold launch, November/December calendars, all 828 times in actual SQLite, January's
unavailable state and a native foreground test notification. See `docs/android-release-result.json`.
That file was 74.87 MiB. Physical-device, Doze and iOS QA remain pending.

Release 1.0.2 passed 41 Jest checks, typecheck, ESLint, native release lint and signature verification.
Its API 35 emulator check verified the system chronometer, 30/15-minute icons, ordinary task removal,
at-time prayer delivery after removal, next-prayer rollover and the independent countdown switch.
See `docs/android-countdown-result.json` and the matching screenshot evidence. Reboot/Doze and
physical-device behavior remain unverified for this release.

Release 1.0.3 passed all 49 Jest checks, typecheck and ESLint. Its bundle includes all 74
regions for October–December: 6,808 records and 61,272 published times. Tests verify the
complete source/review mapping, every region's 92 days, atomic batch rollback, city switching
and replacement of reminder plans. Kəngərli's published 23 October midnight anomaly is
preserved and documented in `data/review/source-anomalies.json`.

Release 1.0.4 improves the Android persistent countdown: a full-area bold minute icon,
larger system-rendered countdowns in compact/expanded notifications, 44 dp urgency symbols
and light/dark colors. Layouts adapt to enlarged system fonts within Android's notification
height limits. Its API 35 emulator QA passed live seconds, 30/15-minute thresholds, ordinary
task removal, background prayer delivery, next-prayer rollover and independent countdown
disable. Compact/expanded hour-long countdowns were visually checked in night mode at 200%
system font scale. Evidence is kept separately in `docs/countdown-layout/`:

```bash
npm run android:countdown-smoke -- --serial emulator-5556 --output-dir docs/countdown-layout
```

Release 1.0.6 adopts the supplied blue crescent icon, with cobalt/cyan surfaces,
light and navy themes, native SVG artwork and coordinated launcher/splash assets.
Larger system fonts expand the tab bar and place prayer times on a separate row.
See [brand assets and visual QA](docs/blue-crescent/README.md).

The first device inspection of 1.0.3 is reserved for the user's local test. Earlier emulator
reports retain their actual 1.0.1/1.0.2 versions. To independently check the new installed
package's entire native SQLite database and capture an offline cold launch on an emulator:

```bash
npm run android:regions-smoke -- --serial emulator-5556
```

This requires the new release to have been opened once. The screenshot must then be visually
inspected before recording `coldLaunchVisuallyVerified: true` in its new QA report.

For an already installed release on a disposable rooted emulator, open **Ayarlar** and run:

```bash
npm run android:notification-smoke -- --serial emulator-5556 --skip-install --from-settings --release
```

This applies test-only ADB permission grants and saves a separate release result, preserving
the earlier debug evidence. It never targets a physical phone.

**Back up both files in `.signing/` securely.** They are ignored by Git and contain the
release identity and passwords. The generator preserves an existing key. Future APK updates
must reuse that key and increment versionCode to preserve the installed app and preferences.
An older development APK has a different signature and needs one uninstall before switching
to this release; uninstalling removes its local preferences.

`npm run web` provides a browser UI preview; it uses the same verified records and a
preview repository, not native SQLite or notifications. Android and iOS are the intended products.

`eas.json` includes development, preview and production profiles. Configure your own EAS
project and store credentials before using EAS. iOS source generation works on Linux;
native iOS compilation/testing requires macOS/Xcode or EAS and a real iOS test environment.

See [architecture](docs/architecture.md), [notification restrictions](docs/notifications.md),
[manual test matrix](docs/native-test-matrix.md), [release checklist](docs/release-checklist.md)
and [engineering report](docs/engineering-report.md).

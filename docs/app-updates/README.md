# Google Play in-app updates

NurVaxt uses Google Play's flexible update flow through the local `NurvaxtUpdates` Expo module.
One global bottom sheet handles availability, download progress, installation readiness and
post-install release highlights. There is no update card above the timetable. A compact
**Yenilə ↑** badge beside the brand remains while Play reports an eligible update, even after
the sheet is dismissed; it becomes a progress percentage during download and **Hazırdır**
when ready. Tapping the badge reopens the same sheet without downloading or checking again.

- After onboarding, check at startup and on foreground entry (at most every 15 minutes while idle).
- An available update offers **Yenilə / Sonra**. No download begins before the Play consent flow.
- **Sonra** and cancelling Play consent suppress that version's offer for 24 hours, including
  across app restarts. A different version or a manual check can show an offer earlier.
- Suppression applies to automatic opening, not the badge or the Settings entry. The badge
  disappears only when Play no longer reports an update (including after installation).
- During a flexible download, show progress and keep the timetable available. **Arxa planda
  davam et**, the close button and Android Back hide the sheet. Progress/completion events
  keep it hidden; they do not interrupt the user by reopening it.
- Once downloaded, **Yenidən başlat** explicitly calls `completeUpdate()`. Never install automatically.
  Deferring installation hides the sheet until the next foreground check or a badge tap.
- Settings shows **Yeniləmə mövcuddur**, download progress or **Yeniləmə hazırdır** while an
  update is active. Otherwise **Yeniləməni yoxla** performs a manual Play check. Background
  errors are silent; manual errors offer the app's Play Store page.
- **Ayarlar → Yeniliklər** opens a separate, scrollable history on every platform. It shows only
  releases at or below the installed build, with the current version identified.
- iOS, web and older development builds without this native module show history, but no Play
  update controls. Release text comes from a public GitHub JSON feed; there is no backend,
  store-page scraping or Expo OTA update service.

## Release notes and announcements

`src/features/app-updates/releases.ts` contains the real, bundled release history. Add each
published build's exact `versionCode`, version, date and user-facing changes there. Set
`important: true` for a release worth introducing automatically; minor fixes remain in history.
The sample future release text from the design preview is not shipped.

`npm run release:notes` generates the current release's Play Store text and the public
`updates.json` feed from these same titles and descriptions. `npm run release:notes:check`
verifies byte-for-byte agreement for both files, the configured/native version and the
[500-character Play limit](https://support.google.com/googleplay/android-developer/answer/9859348).
Both local release-build npm scripts run that check before Gradle starts.

Google Play's [AppUpdateInfo](https://developer.android.com/reference/com/google/android/play/core/appupdate/AppUpdateInfo)
exposes availability/progress and `availableVersionCode()`, but does not supply release notes
or the human-readable future version. The sheet first uses bundled notes for an exact matching
build. For an unknown future build it loads the matching entry from:

https://raw.githubusercontent.com/elcin158/nurvaxt/main/updates.json

The feed carries `schemaVersion: 1`, `packageName: "az.nurvaxt.app"` and a `releases` array
with the same shape as the bundled catalog. Only the exact `versionCode` offered by Play is
displayed; the newest entry in the feed cannot trigger an update or change Play eligibility.
This works for testing tracks too, provided that build's metadata is in the public feed.
Do not include private tester information in release text.

Validated metadata is cached in AsyncStorage for 15 minutes and remains usable offline.
Requests share one in-flight fetch and have a five-second timeout, including the response body.
Failed requests retry after a minute; manual checks can bypass the cache. Invalid metadata,
unknown schema versions, duplicate build codes, oversized responses and missing files fail
quietly. Loading text does not delay the Play offer, download or install. Late responses cannot
replace a different build's notes or reopen a dismissed panel. If no matching text is available,
the panel says so and retains **Play Store-da bax**. Reading remote notes also prevents a repeat
post-install announcement for the same build.

### Publishing release text

1. Add the build's exact code, visible version and changes to `src/features/app-updates/releases.ts`.
2. Run `npm run release:notes` to regenerate `updates.json` and the Play Store text.
3. Commit the metadata to `main` before rolling out that build in Google Play. Draft releases
   may be included: Play still decides which update each device is eligible to receive.
4. Paste the generated `artifacts/google-play/release-notes-<version>-az.txt` into Play Console.

The GitHub Actions release-notes workflow validates changes on pull requests and regenerates
the feed after changes reach `main`. It publishes only generated metadata, with the built-in
`GITHUB_TOKEN`; no personal token, Play Console credentials or application backend is needed.
The workflow can also be run manually. If branch protection prevents its metadata commit,
commit the generated files through the normal pull-request process instead.

Existing installed builds must first receive an app build containing the feed reader; adding
`updates.json` alone cannot change the behavior of an older binary.

The installed build is tracked in AsyncStorage. A fresh install establishes a baseline before
onboarding finishes, without an announcement. Existing users migrating from the old card can
see the current build's important changes once. On later upgrades, an important installed release
opens with **Oldu** once, unless its actual notes were already read in the pre-update sheet.
Closing it or visiting history marks it read. Pending announcements survive app restarts until
acknowledged. Minor releases and downgrades never auto-announce.

The feature requires a new native Android build; a Metro reload or Expo Go cannot add it.
Versions installed before this feature must first receive it through a normal Play update.

## Validation

```bash
npm run typecheck
npm run lint
npm run release:notes:check
npm test -- --runTestsByPath tests/app-updates.test.ts tests/app-update-ui.test.tsx tests/release-history.test.ts tests/release-feed.test.ts tests/release-notes.test.ts
cd android
./gradlew :nurvaxt-updates:compileDebugKotlin --no-daemon --max-workers=2
```

For the real Google Play flow, use [internal app sharing](https://developer.android.com/guide/playcore/in-app-updates/test):

1. Upload and install a build containing this feature using its internal-sharing link.
2. Upload a compatible build with a strictly higher `versionCode` and the same package/signing identity.
3. On the same device/account, open the newer build's sharing link to its Play page, **without installing it**.
4. Launch the older installed build. Confirm the bottom sheet appears with **Yenilə / Sonra**.
5. Check **Sonra**, the persistent badge, restart persistence and a manual check in Settings.
6. Cancel Play consent and confirm the app stays usable; manually check and accept a second time.
7. Verify progress, background dismissal without repeated popups, foreground recovery and
   **Yenidən başlat** after the download finishes.
8. Verify the installed version changed and preferences, city and reminders remain intact.
9. Verify the badge disappears after installation. Test an important bundled release's one-time
   **Oldu** announcement, automatic Play updates, and the Settings release history.

The Google account must own the app (have downloaded it through Play). A sideloaded APK or an
emulator without Play is not proof that the real update flow works. Availability follows the
user's Play eligibility, track and rollout. Ordinary unit/native build checks cannot certify
the real Play download/install flow.

# Google Play in-app updates

NurVaxt uses Google Play's flexible update flow through the local `NurvaxtUpdates` Expo module.
The home screen displays a compact card below the brand header; while it is visible the page
scrolls so the timetable remains accessible on small screens and with larger text.

- After onboarding, check at startup and on foreground entry (at most every 15 minutes while idle).
- An available update offers **Yenilə / Sonra**. No download begins before the Play consent flow.
- **Sonra** and cancelling Play consent suppress that version's offer for 24 hours, including
  across app restarts. A different version or a manual check can show an offer earlier.
- During a flexible download, show progress and keep the timetable available.
- Once downloaded, **Yenidən başlat** explicitly calls `completeUpdate()`. Never install automatically.
  Deferring installation hides the card until the next foreground check.
- **Ayarlar → Yeniləməni yoxla** bypasses the deferral. Background errors are silent; manual errors
  offer the app's Play Store page. No server, store-page scraping or Expo OTA updates are used.
- iOS, web and older development builds without this native module show no update controls.

The feature requires a new native Android build; a Metro reload or Expo Go cannot add it.
Versions installed before this feature must first receive it through a normal Play update.

## Validation

```bash
npm run typecheck
npm run lint
npm test -- --runTestsByPath tests/app-updates.test.ts tests/app-update-ui.test.tsx
cd android
./gradlew :nurvaxt-updates:compileDebugKotlin --no-daemon --max-workers=2
```

For the real Google Play flow, use [internal app sharing](https://developer.android.com/guide/playcore/in-app-updates/test):

1. Upload and install a build containing this feature using its internal-sharing link.
2. Upload a compatible build with a strictly higher `versionCode` and the same package/signing identity.
3. On the same device/account, open the newer build's sharing link to its Play page, **without installing it**.
4. Launch the older installed build. Confirm the compact update card appears.
5. Check **Sonra**, restart persistence and a manual check in Settings.
6. Cancel Play consent and confirm the app stays usable; manually check and accept a second time.
7. Verify progress, background/foreground recovery and **Yenidən başlat** after the download finishes.
8. Verify the installed version changed and preferences, city and reminders remain intact.

The Google account must own the app (have downloaded it through Play). A sideloaded APK or an
emulator without Play is not proof that the real update flow works. Availability follows the
user's Play eligibility, track and rollout. Ordinary unit/native build checks cannot certify
the real Play download/install flow.

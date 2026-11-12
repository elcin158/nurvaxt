# Android home-screen widgets

Three independent launcher entries use the approved blue/cyan visual direction:

- **NurVaxt · Geniş (4×3):** city, date, prayer name/time, minute countdown, progress and five daily prayers.
- **NurVaxt · Kompakt (4×1):** prayer name/time, minute countdown and city.
- **NurVaxt · Kiçik (2×2):** navy surface, city, prayer name/time, progress and minute countdown.

“Növbəti namaz” and “qalıb” are deliberately absent from the visible widget content.
Actual cell dimensions depend on the launcher. Wide and small widgets resize in both
directions; the compact widget resizes horizontally and keeps a single row.

Open **Ayarlar → Ana ekran widget-ləri**, then **Ana ekrana əlavə et** for the desired size.
The launcher owns the final placement dialog. Launchers without pin support show manual instructions.
Tapping an installed widget opens NurVaxt. These native widgets require a new Android build;
Expo Go and a JS-only update cannot register their providers. iOS widgets are not implemented.

## Data and lifecycle

The root layout independently synchronizes the widget calendar after database/preferences
initialization, on city/time-format changes and when the app returns to the foreground.
Only verified records for the selected city are included. The full installed date range is
persisted in private native storage, so widget updates need no React Native runtime, network,
notification permission, foreground service, or enabled prayer reminders.

Widgets follow the five daily prayer starts. İmsak and sunrise are not prayer starts in this
widget timeline. After İşa, the next day's Sübh is labeled **Sabah**. The lower daily strip
always follows the current date in **Asia/Baku**, regardless of the phone's timezone.
Unavailable dates show **Təqvim yoxdur**, never example or extrapolated times. Missing previous
prayer anchors hide the progress indicator.

One shared, non-wakeup RTC alarm updates active widgets at the next minute/prayer/midnight
boundary. Existing exact-alarm access is used when available; otherwise Android may batch
updates. Sleeping devices are not woken just to redraw a widget. The platform's 30-minute
provider refresh remains a fallback. Boot, app replacement, clock/timezone changes, exact
access changes, resizing and restoration refresh the native views. Removing the last widget
cancels the shared alarm. Widgets never ask for another permission.

For accurate minute updates, enable **Ayarlar → Dəqiq vaxt icazəsi**. This is the existing
alarm permission; notification permission and prayer reminders can remain off.

The signed local preview is `artifacts/nurvaxt-1.0.19-widgets-preview.apk`. It retains
version 1.0.19 / code 23 for local testing and has not been published to Google Play.
Its signature, checksum, four CPU architectures and registered providers are recorded in
`apk-validation.json`.

## Verification

```bash
npm run typecheck
npm run lint
npm test
cd android
./gradlew :nurvaxt-alarm:testDebugUnitTest :nurvaxt-alarm:assembleDebugAndroidTest
cd ..
python3 scripts/android-widget-smoke.py --serial emulator-5556
```

The emulator check parcels and inflates the real RemoteViews, validates all three layouts at
normal and minimum sizes, tests 12-hour formatting and 200% font scaling, and checks that
missing data clears the preview times. It writes captures and a result file in this directory.
Run it only on a disposable emulator. Physical-device/OEM launcher behavior needs device QA.

Platform references: [Android widgets](https://developer.android.com/develop/ui/views/appwidgets),
[pinning widgets](https://developer.android.com/develop/ui/views/appwidgets/pin),
[alarm delivery](https://developer.android.com/develop/background-work/services/alarms).

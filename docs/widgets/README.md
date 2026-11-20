# Android home-screen widgets

Seven designs follow the supplied reference artwork and adapt to Android's light and dark system themes.

- **Üfüqi geniş (4×3):** brand, city, date, large prayer/time and countdown, progress and five daily prayers.
- **Şaquli (2×4):** crescent and mosque silhouette, prayer/time, countdown, progress and five prayer rows.
- **Üfüqi kompakt (4×1):** crescent, prayer/time, countdown and city, separated by fine rules.
- **Üfüqi irəliləyişli (4×1):** the compact horizontal design with a progress track.
- **Üfüqi vaxtlar (5×1):** five prayer times with the upcoming prayer highlighted.
- **Kompakt (2×2):** city, large prayer/time, progress and countdown.
- **Siyahı (2×3):** brand, city and five prayer rows without leading icons.

Each design appears once in the Android widget picker. Widgets already placed from earlier
builds also adopt the system theme. On Android 12 and later, the launcher applies the theme
when it renders the widget. Older Android versions redraw on the next widget refresh if the
widget process is inactive when the theme changes.

“Növbəti namaz” and “qalıb” remain absent from the visible widget content. Live times,
countdown and progress come from the verified calendar; the supplied date/times are used
only in launcher thumbnails and the exported design sheet. Actual cell dimensions depend
on the launcher. One-row designs resize horizontally; other designs resize in both directions.
The card fills the launcher bounds without empty bands above or below it. Content positions
adapt to the available width and height while text, crescents and location pins keep their
proportions. Prayer rows in the vertical and list designs have no leading icons.

Touch and hold an empty space on the Android home screen, open **Widget-lər → NurVaxt** and
drag the desired design onto the home screen.
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

## Artwork

`assets/widgets/designs.json` is the shared vector scene for Android Canvas and the launcher preview artwork.
It includes geometry, theme palettes, icon paths and measured font advances. Both renderers
use bundled Manrope Bold/ExtraBold. Android renders a size-specific bitmap in RemoteViews;
TalkBack receives the full live prayer/timetable description on the clickable card.

Edit `scripts/generate-widget-designs.ts`, then regenerate artwork and launcher thumbnails:

```bash
node --import tsx scripts/generate-widget-designs.ts
node --import tsx scripts/render-widget-previews.ts
```

The renderer configures its bundled fonts automatically. The review sheet is
[`design-previews/reference-layout.png`](design-previews/reference-layout.png).
Native emulator captures are saved separately in `native-previews/`.

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

The emulator check parcels and inflates the real RemoteViews, validates all seven designs in
both system themes, checks normal, narrow, tall and wide sizes, and exercises 12-hour formatting,
200% font scaling and missing data. It writes captures and a result file in this directory.
Run it only on a disposable emulator. Physical-device/OEM launcher behavior needs device QA.

Platform references: [Android widgets](https://developer.android.com/develop/ui/views/appwidgets),
[pinning widgets](https://developer.android.com/develop/ui/views/appwidgets/pin),
[alarm delivery](https://developer.android.com/develop/background-work/services/alarms).

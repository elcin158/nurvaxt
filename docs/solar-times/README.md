# Sunrise, kərahət and tab navigation

The main blue card shows the next daily prayer start, then Sübh's end at sunrise while Sübh is
active. The same deadline appears in the ongoing Android countdown. At sunrise both advance
to Zöhr; the prayer timetable retains Sübh's original start time and labels its active row
**Vaxtı davam edir**. Both endpoints must come from the same verified city/date record.
The separate İşa-to-sunrise
countdown — once a card block and a notification row — has been removed from both surfaces,
together with its SVG/native artwork and its entries in the durable native plan. Sunrise itself is
still a source field: it opens the morning kərahət interval and appears in the prayer timetable.
Existing Manrope fonts are retained. The ongoing status icon again stacks the app mark above
the remaining-minute/second count, using the mark alone above 99 minutes. The sunrise deadline
behavior remains in place.

Kərahət is enabled through **Ayarlar → Kərahət vaxtları** and is off by default. The preference
is persisted and older preferences hydrate without losing the user's city or appearance.
The card displays the current day's approximate Hanafi solar intervals. It distinguishes the
upcoming, active and completed intervals, and counts down only while one is running — kərahət is
never announced in advance. Each period has its own persisted length, defaulting to 45, 10 and 45
minutes. In settings, users can enter exact whole minutes from 0 to 120 or adjust by five-minute
steps. Zero drops that period from the card, the list and the Android ongoing panel alike. The
information button exposes the calculation, the current lengths and the source.
The card omits the redundant date and Hanafi subtitle.

[Diyanet's official explanation](https://fetva.diyanet.gov.tr/tr/fetva/mekruh-vakitler-hangileridir-hangi-vakitlerde-kaza-ve-hangi-vakitlerde-nafile-namaz-kilinmaz/0193c42d-52b7-7186-d5b4-f1d3c950ad73)
describes roughly 40–50 minutes after sunrise and before sunset, and roughly 10 minutes
before noon. The defaults are 45, 10 and 45 minutes, adjustable per period, and are explicitly
called estimates.
The sunset endpoint comes from `sunset`, not the later `maghrib` source field. Missing fields
are omitted; unverified records are never used. The Android ongoing notification shows these
states silently; no separate audible kərahət reminders are added.

The expanded ongoing panel retains the prayer countdown and shows a running kərahət with its own
countdown to its end. The compact panel uses a short kərahət status line when one
applies. Native timers and the existing boundary alarm keep it current
without JS.
Disabling kərahət omits its entire native plan. Older native plans without solar fields still load.

Tabs use matching 21 px outline icons, including `today-outline` for **Bu gün**. Selection
changes the icon and label colour, without a background badge or outline. Labels retain their
existing font size and receive enough vertical room to avoid clipping. The upper brand lockup
shows the app's own icon artwork.

The shared palette uses cobalt controls and links, neutral selection groups, softer
outlines, and readable text in dark mode. Appearance, time format, qibla source and calendar mode
use grouped controls with a raised selected surface. Visible prayer times use neutral rows with
outline prayer icons and explicit checkboxes, arranged in two columns from 375 px and one
column on narrower screens or with enlarged fonts. Calendar days and upcoming prayer rows
avoid heavy blue outlines.
Hero captions use a near-white blue and progress uses
a soft ice blue. The same tokens cover settings, city selection, prayer rows, tabs and qibla.
Font families, sizes and weights are retained.

The city selector is a compact full-width card on the home, calendar and qibla pages. Its
location icon, label, city name and chevron share the same layout. The picker has a bordered
search field with a clear action, a result count and separate region cards. The selected region
appears first when not searching; the remaining regions retain Azerbaijani alphabetical order.
Search results retain the existing accent-insensitive matching. Choosing a region still persists
the existing city preference and returns to the previous page.
The picker explicitly respects the bottom safe area and keeps the bounded list above system
navigation, with extra trailing space after the last region. Browser QA through Settings verifies
the full Zərdab row has 32 px below it at 390 × 844; physical system navigation needs device QA.

## Validation

- All 92 Jest tests passed for the solar/preferences/notification changes. After the selection
  refresh, the 29 UI and qibla tests passed again. TypeScript, ESLint and whitespace checks passed.
- Four native JVM tests passed and `:app:assembleDebug` completed with the updated notification
  logo and solar panel. The final Android JavaScript bundle exported successfully.
- Unit coverage includes İşa/sunrise boundaries, continuity across midnight, missing and
  unverified endpoints, actual sunset versus Məğrib, Asia/Baku timestamps and year-end gaps.
- Component coverage checks the next prayer stays primary at night, the sunrise progress,
  the opt-in kərahət card, its active state, source disclosure and persisted preferences.
- Warning coverage checks the default 45-minute boundary, independent periods, zero minutes,
  exact numeric entry, invalid inputs, lower/upper bounds, legacy hydration and persistence.
- Native JVM coverage checks sunrise and kərahət boundaries, active interval priority, disabled
  plans, zero advance warning and selecting the next solar visual alarm. The debug APK compiles.
  Daytime countdown rendering has been checked on the connected Samsung. Physical night,
  active-kərahət, enlarged-font and dark-mode notification QA remains outstanding.
- Browser visual checks cover 390 px light mode and 320 px dark mode, 24/12-hour formats,
  enabled/disabled kərahət and active intervals. Night and active-interval screenshots use a
  temporary local clock fixture, restored before final validation and Android bundle export.
- Browser evidence verifies appearance and local preview preferences, not native storage or
  notification delivery on a physical phone.

## Screenshots

- `screenshots/home-night-light-390.jpg`: next prayer and sunrise progress, simulated 21:00.
- `screenshots/home-night-dark-320-12h.jpg`: compact dark night layout with 12-hour times.
- `screenshots/home-kerahat-active-light-390.jpg`: active Zəval interval, simulated 12:20.
- `screenshots/home-kerahat-active-light-320.jpg`: active interval wrapping on a narrow screen.
- `screenshots/home-kerahat-light-390.jpg`: daytime layout with the updated palette and no subtitle.
- `screenshots/settings-kerahat-enabled.jpg`: feature toggle and three warning controls.
- `screenshots/settings-kerahat-dark-320.jpg`: warning settings in dark mode on a narrow screen.
- `screenshots/settings-modern-light-390.jpg`: grouped appearance/time selectors, kərahət off.
- `screenshots/calendar-modern-light-390.jpg`: subtle selected day and grouped calendar modes.
- `screenshots/home-city-card-light-390.jpg`: compact full-width city selection card.
- `screenshots/cities-modern-light-390.jpg`: region picker with the current city first.
- `screenshots/settings-visible-times-light-390.jpg`: two-column visibility checkboxes.
- `screenshots/cities-zardab-bottom-light-390.jpg`: last region fully visible after opening via Settings.
- `screenshots/notification-logo-preview.png`: enlarged preview of the actual monochrome icon asset.
- `screenshots/notification-logo-24px.png`: 24 px reference of the same asset on a dark background.
- `screenshots/notification-logo-minutes-phone.png`: connected Samsung SM-G990E, logo beside
  the live 40-minute count on 2026-10-11. The previous capture showed 41 minutes with the same logo.
- `screenshots/notification-logo-minutes-equal-phone.png`: earlier equal-height logo/count layout
  on the same phone, 25 minutes to Zöhr. Both solid foreground shapes measure 13 px tall.
- `screenshots/notification-logo-minutes-live-phone.png`: Samsung Now Bar with separate logo
  and 218-minute text after the user enabled “Live notifications for all apps”.
- `screenshots/notification-logo-minutes-seconds-live-phone.png`: updated wide chip at 38:30,
  using a SystemUI Chronometer for live seconds. At one hour or more the chip uses hours:minutes.
- `screenshots/notification-live-card-phone.png`: earlier padded, opaque popup. Its added
  surface/padding was subsequently removed and the original dimensions restored; the app logo
  now uses the existing symbol slot.

Night and active-interval screenshots were recorded before the latest selection styling and
subtitle removal. They document countdown behaviour; the modern settings/daytime images show
the final selection treatment. The small side-by-side icon was replaced by a wider Samsung Now Bar
chip on the connected phone. This optional compatibility path requires the user-enabled global
developer switch and uses vendor extras; it is not guaranteed on other One UI releases.
The ordinary fallback now stacks the logo and count inside Android's fixed slot. Seven native
tests and the release build passed. The phone's clock, city and stored preferences were preserved.

# Home screen design

The home screen uses the approved smooth blue prayer card, an icon-free grouped time list, and a compact bottom navigation bar. The card background follows the supplied NurVaxt banner: calm royal blue on the left, deeper blue below, and sky blue toward the upper right. There are no moons, stars, patterns, or left-side light spots.

## Card rendering and typography

`PrayerCardBackdrop` renders the background with native SVG gradients, so the color field stays smooth at all sizes without a bitmap. Its base stops are #12338C, #1450C1, #1474D1, and #2298D4. A subtle vertical shade keeps the lower content readable. The clipped inner surface has a fine translucent white border; a separate outer surface carries the quiet shadow without clipping it.

The generic “Növbəti namaz” caption is omitted. The specific İmsak and active Sübh captions remain. The countdown uses bundled Manrope Bold with tabular numbers at 44 dp normally and 34–38 dp in compact mode. The scheduled time uses Manrope SemiBold at 22 dp normally and 20 dp in compact mode, or 16 dp beside the sunrise deadline. The timer can use 60% of the horizontal row and fits its digits to the available width. Prayer names and the uppercase labels use a single platform sans-serif family so Azerbaijani Ə (U+018F), missing from Manrope, stays consistent. The name is 34 dp normally and 28–30 dp in compact mode. Large accessibility fonts retain the stacked layout and scrolling.

The progress track spans the full inner card width. Its fill continues to reflect the real prayer interval rather than the 100% illustration used in the mockup. The white endpoint has no glow and stays inside the track bounds at both 0% and 100%. Native and web accessibility expose the progress as a labeled 0–100 value without live announcements on each clock tick.

List times use Manrope Bold with tabular digits at 26 dp (22 dp for twelve-hour times on narrow screens) and align to the right, without a separate background behind the digits. The upcoming time uses the selected accent. Calendar rows are at least 48 dp high; large accessibility fonts stack the label above the time. The shared list applies this typography on both the home and calendar screens. Existing prayer calculations, urgency colors, time-format preferences, and day navigation are preserved.

The home screen fills the available height after safe areas and bottom navigation. Its time list
shares the remaining space equally between visible rows, reducing spacing and number size only
when needed. At system font scales up to 1.1 and with at least 540 dp of usable height, the normal
home view fits without scrolling. Larger accessibility fonts, shorter windows and the optional
expanded kərahət content retain scrolling so information stays accessible.

## Verification

The home layout update passed TypeScript, targeted ESLint and the 21-test UI suite. Browser
previews at 320 × 640 and 320 × 600 with twelve-hour times confirmed all nine rows remained
above bottom navigation. At 320 × 600 the last row ended at 527 px, above navigation at 549 px.
The full screen evidence is `screenshots/home-fit-dark-12h-320x640.jpg`.

The updated countdown typography passed TypeScript, targeted ESLint and the 21-test UI suite.
Local browser previews at 390 × 844 and 320 × 740 confirmed the larger timer fits in the card,
including twelve-hour times on the narrow screen. The narrow-screen countdown rendered with
Manrope Bold at 34 px and tabular digits. The updated screenshots are
`screenshots/home-bold-countdown-light-390.jpg`,
`screenshots/home-bold-countdown-light-12h-320.jpg` and `screenshots/home-bold-countdown-card.jpg`.

The earlier time-list version with rounded backgrounds also passed TypeScript, targeted ESLint and the 21-test UI suite.
Browser previews confirmed all nine rows fit the home screen at 390 × 844 with 24-hour times
and at 320 × 740 with twelve-hour times. The calendar list was checked with twelve-hour times
in dark mode at 390 × 844. Evidence is saved in `screenshots/home-time-capsules-light-390.jpg`,
`screenshots/home-time-capsules-dark-12h-320.jpg`,
`screenshots/calendar-time-capsules-dark-12h-390.jpg` and
`screenshots/prayer-time-capsules-preview.jpg`.

Earlier gradient-card verification:

- TypeScript and targeted ESLint passed.
- Jest: the UI and prayer-domain suites passed, 31 tests total.
- Expo Android production export passed. The old card JPEG is no longer included in the exported asset list. This verifies the JavaScript/Hermes bundle and assets, not an APK installation or device rendering.
- Browser previews at 390 × 844 in light/dark mode and 320 × 740 in dark mode with twelve-hour times showed the card and all nine time rows without scrolling. The card measured 150 dp high in the standard view and 118 dp in the compact view.
- The progress track measured the full inner width (320 dp at a 354 dp card width; 250 dp at a 284 dp card width). The countdown remained live and the accessible progress value followed the real interval.

Screenshots:

- `screenshots/home-gradient-light-390.jpg`
- `screenshots/home-gradient-dark-390.jpg`
- `screenshots/home-gradient-dark-12h-320.jpg`

Earlier geometric-card screenshots are retained as previous design evidence.

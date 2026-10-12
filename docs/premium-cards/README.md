# Home screen design

The home screen uses the approved smooth blue prayer card, an icon-free grouped time list, and a compact bottom navigation bar. The card background follows the supplied NurVaxt banner: calm royal blue on the left, deeper blue below, and sky blue toward the upper right. There are no moons, stars, patterns, or left-side light spots.

## Card rendering and typography

`PrayerCardBackdrop` renders the background with native SVG gradients, so the color field stays smooth at all sizes without a bitmap. Its base stops are #12338C, #1450C1, #1474D1, and #2298D4. A subtle vertical shade keeps the lower content readable. The clipped inner surface has a fine translucent white border; a separate outer surface carries the quiet shadow without clipping it.

Typography follows the approved mockup's proportions: a larger semibold prayer name, a regular-weight countdown, and lighter time and caption text. Countdown and time digits use the bundled Manrope Regular with tabular numbers. Prayer names and the uppercase label use a single platform sans-serif family so Azerbaijani Ə (U+018F), missing from Manrope, stays consistent. The name is 34 dp normally and 28–30 dp in compact mode; the countdown is 36 dp normally and 30–32 dp in compact mode. Large accessibility fonts retain the stacked layout and scrolling.

The progress track spans the full inner card width. Its fill continues to reflect the real prayer interval rather than the 100% illustration used in the mockup. The white endpoint has no glow and stays inside the track bounds at both 0% and 100%. Native and web accessibility expose the progress as a labeled 0–100 value without live announcements on each clock tick.

List times retain Manrope 600 SemiBold at 24 dp (22 dp for twelve-hour times on narrow screens). Existing prayer calculations, urgency colors, time-format preferences, and day navigation are preserved.

## Verification

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

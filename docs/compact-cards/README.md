# Compact cards and icon-matched background

The next-prayer card uses tighter padding and spacing, a 24 dp corner radius and a quieter shadow. Shared cards, settings rows and prayer rows use the same compact spacing. Manrope families, weights, sizes, line heights and letter spacing are preserved.

`assets/prayer-blue-background.jpg` is bundled locally for offline use (1200 × 800). `PrayerCardBackdrop` adds a subtle royal-blue tint so white text stays readable in both themes. The countdown, urgency states and prayer data logic are unchanged.

## Artwork provenance

Tool: built-in imagegen. The supplied app icon (`assets/icon.png`) was used as the color reference for the final edit. The initial navy candidate was replaced with electric blue, cobalt and cyan after user feedback.

### Initial generation prompt

```text
Use case: stylized-concept.
Asset type: background artwork for the existing NurVaxt mobile prayer countdown card, blue crescent visual identity.
Primary request: a restrained premium midnight-blue landscape background, elegant and quiet, with layered distant mountain silhouettes and very soft moonlit haze concentrated in the bottom-right quarter.
Style/medium: sophisticated cinematic matte painting, smooth natural atmospheric depth, very subtle fine texture, luxurious and understated.
Composition/framing: landscape 3:2 composition. The left two thirds and upper half must be almost empty smooth dark navy blue, a clean low-contrast surface for white countdown text. Landscape occupies only the bottom-right, fading softly into the blue. All edges full bleed.
Lighting/mood: serene blue-hour moonlight, dark indigo and sapphire, tiny muted cyan highlights on the far-right ridges.
Color palette: deep midnight navy #081F48, indigo #0C3271, quiet cobalt #145BA5, delicate desaturated cyan #8CCADF.
Constraints: this is ONLY background artwork, no app UI, no card mockup, no words, no text, no lettering, no logo, no watermark. No visible moon, no stars, no architecture, no people, no gold accents, no harsh highlights or bright areas. Dark uninterrupted negative space across the entire left two thirds. High quality subtle atmospheric mountains, avoid clutter and visible banding.
```

### Final edit prompt

```text
Use case: lighting-weather / style-transfer.
Asset type: premium background artwork for a mobile prayer countdown card.
Input images: Image 1 is the EDIT TARGET (existing landscape artwork). Image 2 is a COLOR PALETTE REFERENCE ONLY (NurVaxt blue/cyan app icon).
Primary request: recolor and relight the target background so it feels noticeably brighter and closely matches the reference icon's vibrant electric-blue, royal-blue and cyan gradient. The current landscape is much too dark/navy for the user.
Keep unchanged: landscape composition, atmospheric mountain silhouettes concentrated on the lower-right, clean empty left two thirds, subtle cinematic premium texture, full bleed 3:2 aspect ratio.
Color direction: vivid saturated cobalt and royal blue across the broad left and middle field (#0759D9, #0649D6, #0855D4); a soft luminous cyan/azure glow in the upper-right and on the distant right-hand mountain mist, like the app icon's blue gradient. The bottom can deepen to rich royal blue (#103AB0) but must not become midnight navy, black or grey. Overall make the image materially lighter, more colorful, more blue and lively, while still providing good contrast for white UI text. Keep the left 70 percent at medium cobalt-blue brightness with soft variations, never pale cyan or white.
Constraints: ONLY background artwork, NOT a UI mockup. No text, no logo, no words, no frame, no rounded corners, no crescent or moon copied from the reference, no stars. Do not copy icon lettering. No added architecture or people. Avoid dark navy/black appearance.
```

## Verification

- TypeScript, ESLint and Prettier checks passed.
- All 70 existing Jest tests passed.
- Android production bundle export passed and includes the 71 KB background asset.
- Web visual QA at 390 × 844 and 320 × 740: compact card, background, prayer rows, light/dark themes and 12-hour times.
- The normal next-prayer card measures 233 dp high in the web preview, while keeping the original 48 dp countdown type.
- Screenshots are in `screenshots/`. Native device execution was not part of this change.

# Blue crescent identity · 1.0.6

The supplied icon is preserved in `assets/icon-source.png`. The primary app icon,
in-app brand lockups, iOS icon and launch screens use resized copies of that image.
`npm run assets:generate` reproduces the platform assets; `npx expo prebuild --no-install`
synchronizes Android and iOS resources.

The design uses cobalt blue, cyan moonlight, white surfaces and deep navy in dark mode.
Shared colors, contrast pairs and corner radii live in `src/theme/index.tsx`.
`BrandBackdrop` renders the gradient, crescent and quiet orbital lines with native SVG.
The countdown retains its separate amber/coral urgency indicators and live timing behavior.

Android's adaptive launcher requires a full-bleed image with a smaller, centered mark.
Its source is `assets/adaptive-source.png`; the packaging script adds safe-area spacing
and generates `assets/adaptive-icon.png`. The themed launcher uses the small
crescent in `assets/brand.svg`. Notifications use the full supplied Nur Vaxt wordmark and
crescent, extracted from `assets/mark-mono.png` onto transparency with a 2 dp inset. Android
tints that silhouette in the status bar. The original artwork remains unchanged.

## Image adaptation provenance

Tool: built-in imagegen. A transparent cutout attempt was rejected after visual review;
only the opaque, full-bleed adaptation is used in the project.

Final prompt:

> Use case: precise-object-edit. Edit target: original Nur Vaxt blue crescent icon supplied.
> Asset type: Android adaptive launcher icon texture. Produce a completely OPAQUE square
> image: extend the original smooth cyan-to-royal-blue-to-deep-navy gradient to all four
> canvas edges, NO white outside border and NO rounded corners. Inset the complete existing
> white "Nur" / "Vaxt" two-line lettering and white/cyan crescent composition together into
> the central 60% of the image (central safe square from 20% to 80% horizontally and
> vertically). Keep the exact bold rounded letter shapes, correct text Nur and Vaxt,
> spacing, crescent shape, and relative composition. It must look like the provided logo
> floating cleanly in the center of its own continuous blue gradient. All background fully
> opaque blue, no transparency, no edge frame, no extra words, no texture, no distressed
> edges. Smooth clean premium app icon. The whole composition must fit within a centered
> circle whose diameter is 62% of the full image width, so Android launcher masks cannot
> crop any letter or the crescent.

## Verification

- TypeScript and ESLint passed; all 51 existing Jest tests passed.
- Native build and visual QA results are recorded alongside the screenshots here.
- iOS resources are generated; iOS execution requires macOS/Xcode and was not tested here.

# First-launch splash icon

The Android splash drawables previously stretched the rounded badge across the full
288 dp canvas. Android's circular mask clipped the wordmark and crescent. The badge
now stays at the configured 144 dp width, centered with 72 dp padding, preserving
its rounded corners. All artwork fits inside the
[192 dp safe circle](https://developer.android.com/develop/ui/views/launch/splash-screen).

Five density variants are generated for each theme. The night variants match the
navy splash background, avoiding a light circle around the badge. The source badge
is 576 px to support 144 dp at 4x density; iOS images retain their 144 pt size.
`npm run assets:generate` recreates the source, and `npx expo prebuild --no-install`
synchronizes platform resources from `app.config.ts`.

Verification passed: TypeScript, focused ESLint/Prettier, release assembly, APK
signature and all ten packaged splash images. Their decoded pixels match the
native resources. An isolated API 35 emulator opened the signed APK with fresh
application data in light and dark modes; both reached onboarding. The installed
APK hash matches `artifacts/nurvaxt-splash-release.apk`. iOS assets were regenerated;
iOS execution and physical-device checks were not performed.

- [Before / after](screenshots/comparison.png)
- [Light splash](screenshots/after-light.png)
- [Dark splash](screenshots/after-dark.png)
- [Asset geometry verification](assets-verification.json)
- [APK and emulator verification](verification.json)

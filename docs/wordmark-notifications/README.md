# Crescent-free notifications with stacked countdowns

Every Android notification now uses only the original NurVaxt lettering. Asset
generation masks out the crescent before fitting the wordmark, so native countdowns,
startup notifications, prayer reminders and Expo notifications share the same artwork.
At one hour or more the countdown shows the wordmark alone. Below one hour it shows
the wordmark above the remaining-minute count; below one minute it shows seconds.
The exact duration cutoffs and upward rounding are preserved.

The signed preview is `artifacts/nurvaxt-wordmark-notifications-release.apk`, version
1.0.6, versionCode 7, with the same certificate as the preceding release. The packaged
native bitmap and all five notification densities match the generated resources.
The wordmark contains seven letter components and no crescent component.

Verification passed: TypeScript, focused ESLint/Prettier, 23 notification Jest checks,
12 native unit checks, seven Android instrumentation checks covering 48 display
combinations, release assembly/vital lint, packaged resource checks and APK signature.
An isolated read-only API 35 emulator verified long, minute and second countdowns and
a native prayer reminder using an injected timetable without changing the device clock.
Its installed APK hash matches the delivery artifact. The temporary emulator was closed.
Physical-device installation and verification were not performed.

- [Wordmark countdown](wordmark-countdown.png)
- [Wordmark above minutes](stacked-minutes.png)
- [Wordmark above seconds](stacked-seconds.png)
- [Prayer reminder](prayer-reminder.png)
- [Verification](verification.json)
- [Packaged resources](packaged-resources.json)

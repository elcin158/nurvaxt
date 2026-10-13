# Notification artwork removal

Android countdown, startup and prayer reminders no longer use clock or crescent artwork.
The last hour shows a centered minute count, with seconds below one minute. Longer
countdowns, startup and prayer reminders use a small neutral dot for the required small icon.
The expanded card omits the former clock badge; the existing 30-minute circle and 15-minute
diamond remain. Live Updates no longer supply a clock tracker. Asset generation cannot
reintroduce the removed countdown logo.

The signed preview APK is `artifacts/nurvaxt-clean-notifications-release.apk`, version 1.0.6,
versionCode 7, with the same signing certificate as the preceding release. Its packaged
resources contain neither `nurvaxt_countdown_clock` nor `nurvaxt_countdown_app_mark`.

Verification passed: TypeScript, asset-generator ESLint, 23 notification Jest checks,
12 native unit checks, seven Android instrumentation checks covering 48 layout combinations,
release build/vital lint, resource resolution and signing identity.

The SDK 35 emulator screenshots use an injected test timetable and a silent test reminder.
The emulator clock was preserved. Both the expanded two-hour countdown and final-hour
countdown show the new icons, and the reminder was delivered through the native receiver.
The installed APK hash matches the delivery artifact. Physical-device installation and
verification were not performed. The temporary read-only emulator was closed after QA.

- [Long countdown](neutral-countdown.png)
- [Final-hour countdown](number-countdown.png)
- [Prayer reminder and countdown](prayer-reminder.png)
- [Verification](verification.json)

# Application icons outside the final hour

The countdown shows the supplied NurVaxt application mark at one hour or more, and only
the centered minute/second count below one hour. Startup and independent prayer reminders
also use the full application mark. All three native paths send bitmap bytes to SystemUI.
The neutral dot and standalone clock resources are removed. The expanded card keeps its
existing 30/15-minute urgency shapes, with the former clock badge hidden above 30 minutes.

Asset generation derives both the Expo notification PNG and the native application-mark
PNG from the supplied monochrome mark. Android applies its small-icon tint to the artwork.

The signed preview is `artifacts/nurvaxt-app-icon-notifications-release.apk`, version 1.0.6,
versionCode 7. It uses the preceding release certificate. TypeScript, asset-generator ESLint,
23 notification Jest checks, 12 native unit checks, seven Android instrumentation checks
covering 48 layout combinations, release/vital lint, packaged resources and signature checks passed.

SDK 35 screenshots verify a long countdown with the application icon, a final-hour countdown
with only numbers, and a delivered native test reminder with the application icon. The
temporary read-only emulator used an injected timetable without changing its clock and was
closed after verification. Its installed APK hash matches the delivery artifact.
Physical-device installation and verification were not performed.

- [Application-icon countdown](app-icon-countdown.png)
- [Final-hour countdown](number-countdown.png)
- [Prayer reminder](prayer-reminder.png)
- [Verification](verification.json)

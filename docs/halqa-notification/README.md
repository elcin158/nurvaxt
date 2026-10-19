# Halqa persistent notification

The selected Halqa design uses a timer inside an elapsed-time ring: 34 dp in the
compact notification and 64 dp in the expanded notification. The expanded view
places the prayer name and scheduled time above the live countdown. The ring
replaces the former horizontal progress bar and urgency shapes, using the existing
30/15-minute accent colors. Countdown digits retain the system notification text color.

Elapsed progress uses the existing previous/next prayer timestamps. When the
previous timestamp is unavailable, the ring shows its neutral track and timer.
Small bitmap artwork works with native RemoteViews. The existing service refresh,
system chronometer, status-bar artwork, Live Updates and kərahət details are retained.

The signed preview is `artifacts/nurvaxt-halqa.apk`. All 15 native unit tests and
eight countdown instrumentation tests passed, along with release build/vital lint,
signature and packaged-resource checks. See `verification.json`.

Android 15 / API 35 screenshots use the isolated native test package and a synthetic
timetable without changing the emulator clock. Other cards belong to the emulator's
existing applications. The test countdown was removed and display settings restored.

- [Compact, light](compact-light.png)
- [Expanded, light](expanded-light.png)
- [Expanded, dark, 200% system font](expanded-dark-200.png)

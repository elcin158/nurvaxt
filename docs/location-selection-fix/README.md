# Location selection dismissal safeguards

The report describes NurVaxt closing when switching from Abşeron to Ağsu or Xankəndi.
The reported device was supplied as “S26 FE”; its Android version, installed app version
and a matching crash trace are not available. The original failure did not reproduce
in 12 repeated search-based switches, or the initial unfiltered Abşeron → Ağsu switch,
on the installed Android 15 emulator release.

Two dismissal behaviors were verified in tests:

- Repeated press events could update preferences and call `router.back()` more than once
  before the native modal was removed. Tests for both reported destination cities failed
  with two navigation calls before the fix.
- Updating preferences immediately moved the selected row to the top and inserted recent
  chips while the native picker was closing. The unfiltered Ağsu test demonstrated the
  row changing position during dismissal.

The picker now takes its selected-city/recent-list snapshot when it opens and uses one
synchronous dismissal guard for list choices, recent chips and the close button.
Preferences still update immediately, and reopening the picker shows the latest city
and recent selections. Four regression tests cover these cases, including multiple
presses in one event batch and accepting a fresh choice after reopening.

Validation: 175 Jest tests, TypeScript, ESLint, Prettier, signed Android release build,
release vital lint and packaged notification resources passed. The test APK contains
arm64-v8a, armeabi-v7a and x86_64, with embedded JavaScript, and uses the existing release
certificate. It is built from the current working tree, including changes already present
before this task; version 1.0.6 / versionCode 8 is unchanged.

The fixed APK's emulator checks and screenshots are recorded in `verification.json`,
`agsu.png` and `xankendi.png`. These checks establish emulator behavior and cover the
identified dismissal problems. They do not establish the cause of the reported Samsung
crash. Verification on the affected device is still needed.

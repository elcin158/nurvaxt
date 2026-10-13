# Multiple onboarding reminder times

The onboarding 5/10/15-minute buttons now toggle independently. Selecting another
time adds it to all five daily prayers instead of replacing the previous choice.
Each selected time can be removed separately, including removing all advance
reminders. The default remains ten minutes; at-time alerts, İmsak choices, other
saved offsets and notification sound settings are preserved. The reminders screen
also explains that multiple times can be selected together.

The signed preview is `artifacts/nurvaxt-multi-reminders-release.apk`, version 1.0.6,
versionCode 7, with the same certificate as the preceding release. It includes
the crescent-free notification wordmark and the final-hour stacked icon/count.

TypeScript, focused ESLint/Prettier, 31 related Jest tests and release assembly/vital
lint passed. UI tests cover selecting all three, removing choices independently,
preserving other settings, saved preferences and distinct scheduled alerts.

An isolated read-only API 35 emulator verified all three onboarding checkboxes,
independent deselection/reselection, a cold restart and the selected times in
the reminders screen. The actual durable Android plan contains separate
15/10/5-minute and at-time reminders for each daily prayer. The installed APK hash
matches the delivery artifact. Signature and packaged notification resources were
verified. The emulator clock was preserved and the temporary emulator was closed.
Physical-device installation and execution were not performed.

- [All three selected](all-selected.png)
- [Ten-minute reminder deselected](ten-deselected.png)
- [Saved selections after restart](settings-after-restart.png)
- [Native plan summary](native-plan-summary.json)
- [Verification](verification.json)

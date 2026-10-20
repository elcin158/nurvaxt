# Separate countdown and combined reminders

Historical verification: the separate groups described below were replaced on 20 October
2026 by a shared group to remove the duplicate status-bar icon. See
`../single-status-icon/` for the current implementation and device checks.

The ongoing countdown remains notification `7401` in `nurvaxt-countdown`. Actual prayer,
kərahət and test reminders update one dismissible notification, `7404`, in
`nurvaxt-reminders`. A silent owner summary (`7402`) prevents Samsung's aggregate summary
from replaying the reminder sound when the card is dismissed. SystemUI displays the
countdown and the reminder as separate cards.

The compact reminder shows the latest message. Expanded content shows the retained messages
newest first with Asia/Baku times. Active notification extras hold up to 50 messages; no
separate persistent inbox can bring dismissed messages back. Each new delivery may alert
according to the user's channel settings. Migration from the old timestamp-ID cards is
silent. The existing single-message layout and its font-size fallback are preserved.

The countdown retains `setOngoing(true)` and foreground-service ownership. The initial checks
below verified those flags and reminder dismissal, not the phone's Clear all action. Subsequent
user testing and device logs confirmed that Samsung Android 16 also removes the countdown on
Clear all despite `NO_CLEAR`. See `../countdown-clear-recovery/` for the correction and separate
verification. The app does not promise an unconditionally non-dismissible notification.

## Verification on 19 October 2026

- Debug and signed release builds succeeded; packaged notification resources and release
  signature were verified.
- All 15 native unit tests passed.
- All five reminder instrumentation tests passed on Android 15 / API 35: separate arrivals,
  independent countdown, dismissal/reset, silent legacy migration, deduplication/history
  bounds and single-message layout inflation across themes and large fonts.
- All eight countdown instrumentation tests passed. An existing assertion was corrected to
  check the actual İmsak label and the native timer's localized duration: Android's
  `Chronometer.getContentDescription()` overrides the description supplied through the
  inherited setter.
- On the connected Samsung SM-G990E / Android 16, three real five-second test alarms produced
  exactly one reminder card containing three messages, alongside the separate countdown.
  The expanded SystemUI text was checked directly.
- Swiping only the reminder removed it and its summary, preserved the ongoing/NO_CLEAR
  countdown, and produced no extra sound alert. Three reminder alerts were recorded before
  the swipe and the same three afterward.
- A fourth test alarm started a fresh one-message card without resurrecting the dismissed
  texts. Synthetic test cards were then removed.

The phone had the project's development signing identity. Its compatible test APK is the
same release build re-signed with that identity, retaining app data and working without
Metro. Its installed hash was checked. The normal release-key artifact is also retained;
production signing configuration was not changed.

Artifacts: `artifacts/nurvaxt-combined-notifications-device.apk` (installed on the phone) and
`artifacts/nurvaxt-combined-notifications.apk` (normal release signature). Exact hashes and
test results are in `verification.json`; neighboring files contain app-scoped phone evidence
and emulator instrumentation output.

References: [Android ongoing notification dismissal](https://developer.android.com/about/versions/14/behavior-changes-all#non-dismissable-notifications),
[notification groups](https://developer.android.com/develop/ui/views/notifications/group),
and [Android 15 Chronometer implementation](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/android15-release/core/java/android/widget/Chronometer.java).

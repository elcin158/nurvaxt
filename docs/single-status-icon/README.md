# Single status-bar icon for countdown and reminders

The countdown (`7401`) and combined reminder (`7404`) previously used different groups.
On the connected Samsung SM-G990E / Android 16, three real five-second test alarms produced
one reminder card with three entries but **two NurVaxt status-bar icons** (`screenshots/before.png`).

Both cards now share the `nurvaxt-countdown` group and silent owner summary (`7402`).
SystemUI shows one status-bar icon; the expandable panel group retains the separate countdown
and reminder cards. The summary copies the countdown's current bitmap, including its
minute/second count, and refreshes with the countdown. With reminders alone it uses the app mark.
Only new reminder deliveries may alert; summary and countdown updates remain silent.

When the last reminder is dismissed, the summary remains while it owns the countdown.
SystemUI renders the remaining countdown as a single card. Canceling a summary also cancels
its children, and even re-posting the countdown into another group first races Android's
asynchronous notification queue. Retaining its silent owner preserves the countdown and
its foreground-service ownership without a delayed recovery. Once neither card remains,
the summary is removed. Old combined cards migrate silently with their
active history retained, as covered by instrumentation.

On this Samsung, installing an updated APK itself cleared all existing reminder notifications
(cancellation reason `5`, package changed), before the application's replacement receiver ran.
The active-card migration test therefore verifies regrouping within the test package; the
phone comparison uses three fresh, real AlarmManager deliveries on each installed version.

Device evidence and final test results are recorded in `verification.json`. The normal
release-key artifact installed on the phone is `artifacts/nurvaxt-single-status-icon.apk`.

Verified on 20 October 2026: the release build, signature and packaged resources passed;
all 15 native unit tests and 20 instrumentation tests on the physical phone passed.
Three actual deliveries retained three messages under one icon. Swiping only the reminder
left the countdown visible and its foreground service running; the alert count stayed at
three. The synthetic reminders and isolated test package were removed afterward. The
installed APK's SHA-256 matches the artifact. The phone's countdown was over one hour;
numeric summary changes (40 to 39 minutes) were checked by on-device bitmap assertions.

Reference: [Android notification grouping](https://developer.android.com/develop/ui/views/notifications/group).

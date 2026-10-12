# Foreground notification resource failure

The reported crash was `BadForegroundServiceNotificationException` for notification 7401,
with `RemoteViews.ActionException` and missing resource `0x7f0c0078`. In the local debug APK,
that ID is `nurvaxt_countdown_compact`. The preceding release APK maps the same layout to
`0x7f0b0076`; both layouts and their referenced resources are present in that release.
An APK/resource mismatch during replacement is a plausible cause, but the affected device's
installed APK and full SystemUI log were not available to establish the exact trigger.

Every foreground start now acknowledges Android with a freshly built standard notification
and an explicitly Android-owned icon. It never reuses a cached custom notification.
Package replacement cancels the old countdown before restoring the persisted timetable.
The custom card is locally inflated, including its actions, before submission. Failed
root/nested layout or action resolution falls back to the system chronometer with the same
deadline, prayer metadata and settings action. The existing diagnostics screen reports the
saved `notificationViewError` through `countdownError` while the countdown stays active.

The previous status artwork is restored: app mark above the minute count, seconds in the
final minute, and mark alone above 99 minutes. Small icons always contain bitmap bytes rather
than application resource IDs. Sübh's sunrise deadline behavior is retained.

`RemoteViews.apply()` is a local preflight, not proof of every OEM/SystemUI rendering path.
The service's exception handler cannot intercept an asynchronous SystemUI crash. Replacement
and cold-start verification on the affected phone remain necessary even after emulator checks.

Verification evidence for this build is saved alongside this note. Native instrumentation
uses actual Android resources and parcelled notifications, tests 48 valid display combinations,
and explicitly exercises missing compact, expanded and nested layouts plus invalid actions.
`scripts/verify-countdown-resources.py` checks the final APK's packaged XML, view IDs and
drawable references, including renamed paths after resource shrinking. The normal release
verification script runs this check before copying an APK.

The signed release passed 12 native unit tests and 7 Android instrumentation tests. On the
disposable SDK 36 emulator, upgrading the active 1.0.5 countdown to this APK restored service
notification 7401; a cold launch also restored it without a notification inflation crash.
Compact/expanded SystemUI rendering, the restored status mark/count and Sübh's sunrise
deadline were visually verified. The installed APK hash matches the delivered artifact.
The affected physical phone was not connected for verification.

[Android RemoteViews inflation API](<https://developer.android.com/reference/android/widget/RemoteViews#apply(android.content.Context,android.view.ViewGroup)>) ·
[Android custom notification layout guidance](https://developer.android.com/develop/ui/views/notifications/custom-notification)

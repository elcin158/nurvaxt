# Countdown recovery after Samsung Clear all

The connected Samsung SM-G990E / Android 16 removed countdown notification `7401` on
Clear all (cancellation reason `3`) even while it had `ONGOING_EVENT`, `NO_CLEAR` and
`FOREGROUND_SERVICE`. The service kept running, but the old ordinary card had no delete
intent, so it only returned on the next minute refresh. The earlier claim that the phone's
Clear all could not remove it was not supported by the original reminder-swipe test.

The ordinary countdown and its startup acknowledgement now carry a private broadcast
PendingIntent. When Android removes either card, the receiver immediately re-posts the
same silent countdown ID using the current saved plan. Recovery requires an enabled,
already-running countdown, notification access, an unblocked channel and a future event.
Disabling the setting or stopping the countdown does not bring it back. Dismissed reminder
history is not restored. Live Update dismissal retains the existing demotion behavior.

This is automatic recovery, not a guarantee that a third-party app can prevent Android
from removing the card. No new polling, notification-listener access or private platform
flags were introduced.

## Verification on 19 October 2026

- Release build, APK signing, packaged notification resources and the installed APK hash
  were verified. The phone update retained existing app data and used its existing
  development signing identity.
- All 15 native unit tests and 18 Android instrumentation tests passed. The five new tests
  exercise the actual delete PendingIntent, silent single-card recovery, disabled/stopped
  countdowns, expired timetables and the startup recovery intent. The previous five reminder
  tests and eight countdown layout tests also passed.
- The user pressed the phone's actual Clear button after installation. Device events show
  `7401` canceled with reason `3` at epoch `1792397510.630`, then re-posted at
  `1792397510.675`: **45 ms** between cancellation and re-enqueue. The countdown was present
  afterward and produced no sound alert. This measures the notification service events,
  not the precise frame in which SystemUI painted the card.
- The user independently confirmed that the countdown returned immediately.

`phone-clear-all.json` and `phone-clear-all-events.txt` contain the app-scoped device evidence.
`verification.json` records APK hashes and test counts. The normal release-key artifact is
`artifacts/nurvaxt-countdown-clear-recovery.apk`; the compatible artifact installed on the
phone is `artifacts/nurvaxt-countdown-clear-recovery-device.apk`.

# S21 FE Live Notification investigation — 12 October 2026

The attached Samsung SM-G990E runs Android 16, full SDK 36.0, One UI 8.0,
build `G990EXXSOHZH4`. Its installed Nur Vaxt is version 1.0.6, versionCode 7,
target SDK 36. Its ordinary notification permission is granted. The active
countdown uses `DecoratedCustomViewStyle` and custom RemoteViews; it contains
neither a promotion request nor Samsung ongoing-activity extras.

## Controlled comparison

A separate disposable package, `az.nurvaxt.liveprobe`, posted the same silent
native `Notification.ProgressStyle` notification with an explicit
`android.requestPromotedOngoing=true`, an ongoing flag, title, ten-minute
chronometer and no custom views. It declared both notification permissions
and `com.samsung.android.support.ongoing_activity=true` metadata.

The countdown was explicitly labelled as a test, not a real prayer. The test
switch was changed temporarily; no phone-clock or Nur Vaxt data changes were
made. The notification was inspected from its normal app notification settings,
because Samsung can hide an app's live chip while that app is foreground.

| Observation | Developer switch off | Developer switch on |
| --- | --- | --- |
| Ordinary notifications allowed | true | true |
| `hasPromotableCharacteristics()` | true | true |
| `canPostPromotedNotifications()` | false | false |
| Posted `FLAG_PROMOTED_ONGOING` | absent | absent |
| Samsung active Live Notifications entry for this test | absent | present; added and inflated |
| Status-bar appearance | ordinary alarm icon | live chip with test title |

The normal app notification settings displayed no Live Notifications control for
the fixture. The metadata declaration alone did not grant normal promotion.

Evidence: [comparison JSON](probe-comparison.json),
[switch off screenshot](probe-switch-0.png),
[switch on screenshot](probe-switch-1.png),
[off SystemUI evidence](probe-switch-0-systemui.txt),
[on SystemUI evidence](probe-switch-1-systemui.txt).
The off dump includes an earlier fixture's removal history; that is not an active
live entry. The current comparison used UID 10393.

## Firmware findings

Read-only inspection of the phone's actual `framework.jar`, `services.jar` and
`SystemUI.apk` established:

- `Notification.isRequestPromotedOngoing()` reads
  `android.requestPromotedOngoing` on this SDK 36.0 firmware.
- `Notification.hasPromotableCharacteristics()` checks request, ongoing flag,
  title, style, group-summary status, custom views and colorization. The valid
  fixture passes this check.
- `NotificationManager.canPostPromotedNotifications()` calls the server's
  `canBePromoted` check, which reads the app's `canHavePromotedNotifs` preference.
- `NotificationEntry.setSbn()` checks the
  `AllowedOngoingActivityListManager.allowedList`. Setting
  `enable_notification_nowbar_test=1` bypasses that list check; it can then
  recognize a structurally eligible notification as a Samsung ongoing activity.
- Normal Samsung ongoing-activity permission/list management is protected by
  system/SystemUI access (`STATUS_BAR_SERVICE`). An ordinary app cannot grant
  itself that permission through those methods.

This explains why Samsung's developer switch can produce a visible live chip
even while the standard permission and posted promotion flag remain false.
The feature is supported by this phone; normal third-party eligibility is the
blocking condition for the tested native notification.

The earlier statement that SDK 36.0 cannot read the promotion request was too
broad. The request constant is documented as public from SDK 36.1, but this
Samsung firmware already implements its parser. That does not establish a
supported, developer-switch-free third-party path on this firmware.

## Application implications and cleanup

The production application's public path currently requires SDK 36.1, permission,
the last 30 minutes before prayer and a non-dismissed prayer. On SDK 36.0 it
keeps the ordinary expandable countdown. Merely lowering its SDK threshold
does not resolve the denied normal promotion or Samsung list check. Its custom
fallback is also ineligible for standard Android Live Updates.

This investigation tested a disposable native candidate; it did not replace or
modify the installed Nur Vaxt APK, nor reintroduce the previously reverted
Samsung developer-test integration.

The original developer switch was `1`; it was restored to `1`. The fixture was
uninstalled successfully. Only investigation evidence was added to the project.

Official API references:
[Live Updates eligibility and OEM criteria](https://developer.android.com/develop/ui/views/notifications/live-update),
[promotion request constant, public from 36.1](https://developer.android.com/reference/android/app/Notification#EXTRA_REQUEST_PROMOTED_ONGOING).

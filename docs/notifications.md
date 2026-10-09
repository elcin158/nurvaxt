# Notification implementation and limits

References checked on 9 October 2026:

- [Android alarm scheduling](https://developer.android.com/develop/background-work/services/alarms)
- [Android 14 exact alarm access](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)
- [Foreground service types and specialUse](https://developer.android.com/develop/background-work/services/fgs/service-types)
- [Foreground service background start restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)
- [Notification chronometer and small-icon APIs](https://developer.android.com/reference/androidx/core/app/NotificationCompat.Builder)
- [Decorated custom notifications and layout limits](https://developer.android.com/develop/ui/views/notifications/custom-notification)
- [RemoteViews system chronometer](https://developer.android.com/reference/android/widget/RemoteViews#setChronometer(int,long,java.lang.String,boolean))
- [Google Play restricted permission policies](https://support.google.com/googleplay/android-developer/answer/16558241)
- [Expo SDK 55 notifications](https://docs.expo.dev/versions/v55.0.0/sdk/notifications/)
- [Apple local notification guidance](https://developer.apple.com/documentation/usernotifications)
- [Apple legacy pending-limit documentation](https://developer.apple.com/documentation/UIKit/UILocalNotification)

## Android

When reminders are enabled, all five daily prayers receive an at-time notification by default,
even when no advance offset is selected. The `Namaz vaxtı bildirişi` switch controls this.
İmsak remains a separate opt-in event. Quiet hours and global notification disable still apply.
Existing stored preferences gain the new switches without losing city, sound or offset choices.

Local module `modules/nurvaxt-alarm` uses PendingIntent-based AlarmManager requests.
`SCHEDULE_EXACT_ALARM` is declared for user-selected precisely timed religious reminders.
It is special app access, checked through `canScheduleExactAlarms()`, with an explicit settings
shortcut following an explanation. New installations may not have it. `USE_EXACT_ALARM`
is blocked: eligibility for restricted alarm/calendar categories is not presumed. Public Play
submission still requires policy review; successful compilation is not Play approval.

With exact access, use `setExactAndAllowWhileIdle`; without it use `setAndAllowWhileIdle`
and show that delivery may be delayed. POST_NOTIFICATIONS is requested contextually on
Android 13+. Prayer reminder delivery remains independent of the countdown foreground service.

### Persistent countdown

`Daimi vaxt göstəricisi` defaults on when notifications are enabled. A separate native
`CountdownService` shows a silent, default-importance ongoing notification and a bitmap status icon.
The monochrome status icon shows total remaining minutes in one bold line, fitted to the available
icon area using glyph bounds. It keeps the digits large even over an hour and at urgency thresholds.
Android controls the actual status-bar slot dimensions; increasing bitmap resolution cannot enlarge it.
The notification panel uses `DecoratedCustomViewStyle`, preserving Android's header, expander and
settings action. Its compact content fits the 48 dp system limit and shows a 28 sp live countdown
beside the prayer/time. Expanded content shows a 36 sp countdown, a 44 dp symbol, urgency text,
city and progress. The symbol changes to a circle at 30 minutes and a diamond at 15 minutes;
green/amber/coral colors have separate light/dark resources. Notification text inherits Android's
notification styles instead of a fixed background/text palette. The app's countdown card also
uses amber/coral colors and text labels. The prayer time follows the selected clock format.
The channel has no sound/vibration and updates alert only once. Default importance helps keep
the timer visible among other notifications without heads-up banners. Android still controls icon
order and available status-bar slots; user settings can hide status icons.

The durable countdown timetable contains only the selected city's verified five daily prayers,
independently of advance reminder offsets. It considers today/tomorrow in Asia/Baku and stops
when no verified next prayer exists. It never bridges a missing date to a distant future record.
Disabling the countdown removes its service/notification/boundary alarm without canceling prayer
reminders. Global disable, denied notification permission and a blocked countdown channel stop it.

The foreground service uses `specialUse` with an explicit manifest subtype and its required
permissions. Google Play submission requires a foreground-service declaration/review of this use
case; local compilation does not establish approval. It starts on user-enabled reconciliation and
restores from the durable plan after supported boot/time/package broadcasts and sticky process
restart. Android force-stop/Task Manager stop and OEM restrictions can still stop it until launch.

Minute icon updates use a native Handler, not a React timer or wake lock. Screen-on/unlock
recalculates immediately. Only the next 30/15-minute/prayer boundary is registered separately
with AlarmManager to refresh after device sleep, using the existing exact-access/inexact fallback.
The `RemoteViews` chronometers use an elapsed-realtime base and render seconds in SystemUI;
updates are silent and do not repeat sound/vibration. The header's smaller timer is hidden to
avoid duplicating the main countdown. Standard title/body metadata remains for accessibility
and other notification surfaces. Visual QA must include compact/expanded views, hour-long
countdowns, both urgency thresholds, night mode and enlarged system fonts.
These boundary requests also share Android's idle alarm rate limits. Physical-device battery and
Doze QA remain required.

The native queue persists the complete available future plan and registers only 32 upcoming
timestamps, not a year of individual alarms. AlarmReceiver consumes due requests and refills.
RestoreReceiver handles boot, package replacement, wall-clock/timezone changes and exact
access grants. Events delayed over ten minutes are dropped to avoid misleading stale reminders.
Doze rate limits can still coalesce/defer close 5/10/15-minute alarms; OEM battery restrictions,
reboots before unlock, special-access revocation and device power-off can prevent delivery.
Receivers are not a guarantee against OS restrictions. No battery-exemption permission is requested.

Normal task swipe-away and explicit force-stop are different. Force-stop suppresses receivers
and alarms until a user launch; launch reconciliation restores future reminders. Some vendors
treat task removal more aggressively. Reboot handling only resumes requests within the bundled
verified date range. Exhausted data must be updated, not extrapolated.

Channels encode sound (silent/default/original one-second tone) and vibration. System channel
settings override application choices. No unlicensed azan audio is bundled. The foreground
native notification is handled by the Android system independently of Expo's JS handler.

## iOS

At-time prayer notifications and in-app urgency labels also apply on iOS. The Android persistent
status icon/foreground service is not exposed as an iOS setting; an iOS Live Activity is not implemented.

Expo uses native UNUserNotificationCenter local date triggers. The app schedules the earliest
60 requests, conservatively reserving room below Apple's historically documented 64-request
limit; this historical limit is not claimed as a newly documented UN API guarantee. Stable
identifiers/fingerprints support diff reconciliation. Start, resume, city/settings/data changes
replenish the queue. No background-task replenishment guarantee is made.

Several reminders for each prayer can exhaust 60 requests in a few days. Users must reopen
the app periodically; **indefinite unattended iOS reminders are not supported**. Focus, silent
mode, notification settings and power-off can affect presentation/sound. Per-notification
vibration is controlled by iOS settings. Custom sound is one second; full background azan is
not implemented. Normal terminated-app delivery is native for already scheduled requests,
but has not been physically verified in this Linux environment.

Permission denial never blocks the timetable, does not repeatedly prompt on resume, and
provides an OS settings shortcut. Test notification is scheduled five seconds ahead; Android
uses the same durable native AlarmManager queue as prayer reminders, including the inexact
fallback when exact access is unavailable. Hidden diagnostics
show permission, city, timezone, current time, next event, registered/queued counts, last operation,
last error, exact access and reconciliation status.

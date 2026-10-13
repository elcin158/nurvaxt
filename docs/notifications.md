# Notification implementation and limits

References checked on 9 October 2026:

- [Android alarm scheduling](https://developer.android.com/develop/background-work/services/alarms)
- [Android 14 exact alarm access](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)
- [Foreground service types and specialUse](https://developer.android.com/develop/background-work/services/fgs/service-types)
- [Foreground service background start restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)
- [Notification chronometer and small-icon APIs](https://developer.android.com/reference/androidx/core/app/NotificationCompat.Builder)
- [Decorated custom notifications and layout limits](https://developer.android.com/develop/ui/views/notifications/custom-notification)
- [RemoteViews system chronometer](<https://developer.android.com/reference/android/widget/RemoteViews#setChronometer(int,long,java.lang.String,boolean)>)
- [Google Play restricted permission policies](https://support.google.com/googleplay/android-developer/answer/16558241)
- [Expo SDK 55 notifications](https://docs.expo.dev/versions/v55.0.0/sdk/notifications/)
- [Apple local notification guidance](https://developer.apple.com/documentation/usernotifications)
- [Apple legacy pending-limit documentation](https://developer.apple.com/documentation/UIKit/UILocalNotification)

## Android

When reminders are enabled, all five daily prayers receive an at-time notification by default,
even when no advance offset is selected. The `Namaz vaxtı bildirişi` switch controls this.
İmsak remains a separate opt-in event. Quiet hours and global notification disable still apply.
Existing stored preferences gain the new switches without losing city, sound or offset choices.
The onboarding 5/10/15-minute choices are independent toggles and can all be selected
together. They apply to all five daily prayers while preserving İmsak and other saved
offsets. Each selected offset produces a distinct reminder, alongside the at-time alert.
The reminders screen retains independent multiple selections for each prayer.

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

`Daimi vaxt göstəricisi` defaults on once notifications are enabled, and switching it off posts
nothing at all — no panel entry and no status-bar slot. While on, a native
`CountdownService` shows a silent, default-importance ongoing notification and a status icon.
At one hour or more, the countdown status icon shows only the NurVaxt wordmark, with the
crescent removed. Below one hour it stacks that same wordmark above the remaining-minute
count, switching to a second count below one minute.
The cutoffs use the actual remaining time; numeric counts retain their upward rounding.
Text is fitted to the slot width. The brief startup notification uses the same application mark,
decoded locally and sent as bitmap bytes while the plan loads.
Android controls the square slot
dimensions; increasing bitmap resolution cannot enlarge it.
The earlier side-by-side implementation measured 13 px for each shape on the connected Samsung
and was rejected as too small; its screenshots are retained as historical evidence.

On Android 16 QPR2 (full SDK 36.1)+, the whole countdown to the next verified prayer can request a public
Android Live Update. The native `ProgressStyle` tracks the interval since the previous prayer
through normal/amber/coral segments (the last two cover the final 30 and 15 minutes) without a
custom tracker icon; with no previous prayer it covers the final 30 minutes. SystemUI prefers a
chronometer over `shortCriticalText` but leaves the chip icon-only for countdowns above one hour,
so there the chronometer is removed and the chip shows minute-rounded-up hours:minutes text,
refreshed by the minute service tick and an exact one-hour boundary alarm; the final hour uses the
SystemUI minutes:seconds chronometer.
The promoted card keeps the plain wordmark small icon because the chip already shows the time;
the stacked wordmark/minute icon is used only by the ordinary fallback card. The notification validates `hasPromotableCharacteristics()` before choosing the native card and declares
`POST_PROMOTED_NOTIFICATIONS`, requests `android.requestPromotedOngoing`, stays ongoing and
contains no custom RemoteViews. Promotion also requires `canPostPromotedNotifications()`;
Android and the manufacturer determine whether the eligible notification is actually promoted.
The setup UI checks `FLAG_PROMOTED_ONGOING` on the posted notification instead of interpreting
permission alone as a visible Live Update.

**Canlı nişanı yığ** demotes the current prayer to the modern ordinary card. The delete intent
handles system dismissal the same way, persisting that prayer timestamp so minute updates,
app reconciliation and service restarts do not immediately re-promote it. A later prayer starts
a new imminent interval. Independent prayer reminders are unaffected.

The optional **Canlı göstərici** onboarding/settings guide on public-API systems opens app-specific public
Android notification settings: the dedicated promoted-notification action when provided, or the
normal app notification page containing the Live Updates switch. It preserves reminder choices, requests ordinary
notification access only after a user tap, and rereads access/actual promotion on app resume.
Samsung SDK 36.0 and other unsupported phones keep the ordinary system-expandable card.
The optional Samsung developer-test path has been removed at the user's request. The app no
longer reads its secure switch, emits private ongoing-activity extras or opens Developer options.
Unsupported phones have no Live Updates setup invitation; the ordinary countdown continues.
Public SDK 36.1+ retains the permission check and dismissal suppression.

Official references: [Live Updates](https://developer.android.com/develop/ui/views/notifications/live-update)
and [ProgressStyle](https://developer.android.com/reference/android/app/Notification.ProgressStyle).
Android's promoted card is expanded and uncollapsible; the ordinary custom card retains the
system expander. The earlier Samsung developer-test screenshots in `docs/modern-notifications`
are historical design evidence, not proof of public Live Update support on that phone. The
reverted Samsung experiment is described in `docs/dual-live-updates` as historical work.

The `notification_icon` asset and native prayer reminders use only the supplied NurVaxt
lettering. Asset generation masks out the crescent before fitting the wordmark, and Expo
prebuild preserves that notification artwork. The ongoing countdown shows the wordmark
at one hour or more and stacks it above its remaining-minute/second count in the final hour.
Startup and independent reminders use the same crescent-free wordmark. It sends the artwork as bitmap bytes
to SystemUI, so the small icon does not depend on resolving an app resource in another process.
Launcher icons retain the app artwork.
The notification panel uses `DecoratedCustomViewStyle`, preserving Android's header and expander.
The standalone **qalıb** caption and **Ayarlar** action are omitted.
Its custom layouts may contain only `@RemoteView` classes — `LinearLayout`,
`FrameLayout`, `TextView`, `ImageView`, `ProgressBar`, `Chronometer` and the like. A plain
`android.view.View`, even as a hairline divider, fails SystemUI inflation and crashes the app with
`BadForegroundServiceNotificationException`, so dividers are 1 dp `ImageView`s with a background. Its compact content fits the 48 dp system limit and shows a 26 sp live countdown
beside the prayer/time. Expanded content groups the prayer and time beside an optional 36 dp urgency badge,
with a right-aligned 32 sp countdown, urgency text and a slim rounded progress track.
The badge is hidden above 30 minutes, shows a circle at 30 minutes and a diamond at 15 minutes;
blue/amber/coral colors have separate light/dark resources. Only that one urgency accent is
colored: the badge, tracks, dividers and secondary meters use neutral light/dark resources, and
notification text inherits Android's notification styles instead of a fixed background/text
palette. The app's countdown card also
uses amber/coral colors and text labels. The prayer time follows the selected clock format.
The channel has no sound/vibration and updates alert only once. Default importance helps keep
the timer visible among other notifications without heads-up banners. Android still controls icon
order and available status-bar slots; user settings can hide status icons.

The primary countdown timetable contains the selected city's verified five daily prayer starts
and Sübh's sunrise deadline, independently of advance reminder offsets. Before Sübh it counts
down to the prayer start. From the exact start until sunrise, both the app card and ongoing panel
show **Sübhün bitməsinə qalan vaxt**, with **Günçıxma** beside the deadline time. At sunrise they
advance to Zöhr. This end event requires both endpoints in the same verified record; it creates
no reminder and does not request Live Update promotion. Missing sunrise omits the end event.
Older native events without `phase` still decode as prayer starts; reconciliation supplies the
updated plan. The countdown considers today/tomorrow in Asia/Baku and stops when no verified
event exists. It never bridges a missing date to a distant future record.
The separate İşa-to-sunrise row and night meter remain removed. The durable solar plan supplies
the verified kərahət intervals. Kərahət is off by default. When enabled, the panel
shows the approaching or active approximate interval, with a chronometer to its start or end.
Each of the three advance-warning thresholds is configurable from 0 to 120 minutes and defaults
to 45. Zero disables only the advance warning. Disabling kərahət removes all kərahət entries
from the native plan. The compact panel uses a brief kərahət status line when one applies; the next prayer remains
the main countdown in both layouts. These displays are silent and add no prayer-reminder events.
Disabling the countdown removes its service/notification/boundary alarm without canceling prayer
reminders. Global disable, denied notification permission and a blocked countdown channel stop it.

The foreground service uses `specialUse` with an explicit manifest subtype and its required
permissions. Google Play submission requires a foreground-service declaration/review of this use
case; local compilation does not establish approval. It starts on user-enabled reconciliation and
restores from the durable plan after supported boot/time/package broadcasts and sticky process
restart. Android force-stop/Task Manager stop and OEM restrictions can still stop it until launch.

Every service start first calls `ServiceCompat.startForeground()` with a fresh ordinary startup
notification that uses the application mark as bitmap bytes and no custom layouts. Cached custom cards are never reused
for foreground acknowledgement. Plan decoding, bitmap/RemoteViews preparation and Live
Update checks run after that acknowledgement. Disabled, exhausted or invalid plans still remove
the notification and stop the service. Preparation failures are saved in countdown diagnostics
and logged with the `NurvaxtCountdown` tag. This avoids leaving Android's foreground-start
deadline dependent on card preparation; see [foreground-service startup troubleshooting](https://developer.android.com/develop/background-work/services/fgs/troubleshooting#internal_exception_foregroundservicedidnotstartintimeexception).

Before posting the custom countdown, the app inflates both `RemoteViews` and executes their
actions locally. If layout/resource resolution or an action fails, it posts the standard system
countdown with the same prayer, location and deadline. The failure is logged and
stored as `notificationViewError` in native countdown preferences. A surrounding service
`try/catch` alone cannot catch the asynchronous SystemUI foreground-notification crash.
Package replacement removes the old countdown notification before restoring the durable plan;
debug and release APKs may assign different numeric IDs to the same layout. Local preflight
does not reproduce every OEM/SystemUI resource-cache failure, so APK replacement still needs
verification on the affected phone.

Native instrumentation tests under `modules/nurvaxt-alarm/android/src/androidTest` cover
parcelled compact/expanded cards in light/dark mode, prayer-start/Sübh-end phases, urgency
thresholds, kərahət states, missing root/nested layouts and invalid actions. Run
`./gradlew :nurvaxt-alarm:assembleDebugAndroidTest` from `android`, install its test APK on a
disposable emulator and run `adb shell am instrument -w
az.nurvaxt.alarm.test/az.nurvaxt.alarm.CountdownTestRunner`. Run
`python3 scripts/verify-countdown-resources.py path/to.apk` to verify the final packaged XML,
view IDs and drawable references after resource shrinking.

Minute icon updates use a native Handler, not a React timer or wake lock. Screen-on/unlock
recalculates immediately. Only the next prayer urgency or solar display boundary is registered separately
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

Channels encode sound (silent/default/short tone/soft tone/bell/melody) and vibration. System channel
settings override application choices. No unlicensed azan audio is bundled. The foreground
native notification is handled by the Android system independently of Expo's JS handler.

The reminder sound list plays a short preview when selected, with a separate play/stop button
for listening without changing the saved choice. Web also previews on hover; if browser autoplay
blocks it, the user can click the play button. New previews stop the previous sound. Leaving the
screen, backgrounding the app, choosing silent, and hovering out stop playback. Android's default
preview uses `RingtoneManager` in `NurvaxtAlarm`, so Android resolves the system URI/cache and
can use its remote ringtone player when direct media access is restricted. It uses the notification
volume, reports an unset/muted system sound, and only shows playback after the native player starts.
Native cleanup stops it on background/module destruction and after at most four seconds; the UI
also observes natural completion. iOS and web only preview the bundled tones;
the system default remains selectable and is explained in the UI.

The four original PCM WAV files live in `assets/`, `android/app/src/main/res/raw/`, and the iOS
app's Resources build phase. Regenerate them with `node --import tsx scripts/generate-sounds.ts`;
`npm run assets:generate` also regenerates them. Expo notification configuration and the Android
config plugin retain these resources on prebuild. Bundled-tone previews use `expo-audio` on native and
an HTML audio element on web, without microphone permission or background playback. A new
native build is required after adding the module or notification resources.

To add another tone, add its ID and metadata to `src/features/notifications/sounds.ts`, a static
asset require to `previewSources.ts`, its filename to `app.config.ts`, and its ID to Android's
`ReminderSounds.kt`. Add or generate the PCM WAV, then run Expo prebuild to copy it into the native
projects before building. Keep the sound below iOS's 30-second notification sound limit. The
preference schema accepts the shared ID list; planned notifications and reconciliation retain
the selected sound. The sound tests check preference restoration, preview cancellation, and
matching resource copies for native delivery.

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
vibration is controlled by iOS settings. Bundled custom sounds last 1–1.8 seconds; full background azan is
not implemented. Normal terminated-app delivery is native for already scheduled requests,
but has not been physically verified in this Linux environment.

Permission denial never blocks the timetable, does not repeatedly prompt on resume, and
provides an OS settings shortcut. Test notification is scheduled five seconds ahead; Android
uses the same durable native AlarmManager queue as prayer reminders, including the inexact
fallback when exact access is unavailable. Hidden diagnostics
show permission, city, timezone, current time, next event, registered/queued counts, last operation,
last error, exact access and reconciliation status.

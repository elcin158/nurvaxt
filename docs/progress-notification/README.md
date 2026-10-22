# Progress notification

The ordinary Android countdown contains a horizontal time track in both sizes. Compact
content shows only the prayer name, scheduled time and native per-second prayer countdown;
kərahət is represented only by its red interval on the track. Expanded content adds the
upcoming/active kərahət row, with a minute-only countdown such as `5`, without a unit suffix. It rounds up,
including the final minute, and refreshes at the kərahət target's minute boundaries even
when they differ from the prayer timer's ticks.

The kərahət label and clock stay on one line, including at large font sizes. The narrower
minute column leaves room for that inline clock. The clock matches the phase: `Kərahət girməsinə` shows the start, while
`Kərahət bitməsinə` shows the end. Scheduled times honor the saved 12/24-hour format;
kərahət endpoints are formatted in Asia/Baku. Prayer digits use navy in light mode and
white in dark mode; scheduled prayer times use a softer secondary color. Kərahət labels/digits
use crimson/coral. Screen-reader descriptions retain
the event meaning, minute unit and estimated nature of kərahət, without reintroducing seconds.
During the sunrise end phase, `Günçıxma` distinguishes an end countdown from a prayer start.

The empty track is pale lavender in light mode and slate in dark mode, filling blue/cyan as time elapses. Actual previous/next
prayer timestamps define the shared scale. Real kərahət intervals are clipped to that range,
merged when they overlap, and shown in red, including upcoming portions. The capsule has a
glossy upper edge, shaded lower edge and soft blue/red glow, following the supplied visual reference.
A dark navy circular marker with a white border shows the current position in both themes.
The artwork scales uniformly so the marker stays circular
in compact and expanded content. Without a valid previous prayer, the track stays
neutral and the position marker is omitted.

The artwork contains a 12 dp track and 16 dp outlined marker in a 24 dp slot. Expanded content
uses that full slot; compact content fits it uniformly into 20 dp to retain room for its timer.
The bitmap density is capped at 3, keeping each bitmap below 384 KB even on high-density devices.
Expanded content uses a bold prayer name and countdown, with a larger kərahət row.
Compact prayer names may autosize down to 8 sp to fit narrow cards at 200% system font size.
Chronometers use a single maximum line with horizontal scrolling disabled so autosizing considers
the available width for longer durations and large fonts. Android's [TextView implementation](https://github.com/aosp-mirror/platform_frameworks_base/blob/android15-release/core/java/android/widget/TextView.java#L10646)
uses an unrestricted width when horizontal scrolling is enabled.

The earlier flat-track sizing is shown in the [previous preview](thicker-track/expanded-light.png),
with its checks recorded in [verification.json](thicker-track/verification.json).
The glossy design APK is `artifacts/nurvaxt-glossy-notification.apk`; build, signature, packaged
resource and test results are recorded in [glossy-track/verification.json](glossy-track/verification.json).
The final sizing fix was compiled and checked in the packaged APK. Device tests were not rerun
after the user instructed us not to connect to the Lenovo emulator.

Expanded content shows an approaching interval only when its start is at or before the
displayed prayer boundary; expired and unrelated future rows are hidden. The compact body
stays within Android's 48 dp limit. Timer columns are bounded and text autosizes for narrow
screens and large system fonts. The system owns the outer header, app name, icon and expansion
control. Public Live Updates retain their native template and promotion behavior; this custom
layout serves ordinary expandable notifications, including Samsung SDK 36.0. The shared
countdown/reminder group and single status-bar icon behavior are preserved.

The earlier minute-countdown APK is `artifacts/nurvaxt-progress-minutes.apk`. Its checks and screenshots
are recorded in [minute-update/verification.json](minute-update/verification.json). Preview
screenshots use the isolated `Önizləmə` test package with synthetic times.

- [Compact, light](minute-update/compact-light.png)
- [Expanded, light](minute-update/expanded-light.png)
- [Compact, dark, 200% font](minute-update/compact-dark-200.png)
- [Expanded, dark, 200% font](minute-update/expanded-dark-200.png)

## Earlier preview verification

The signed preview APK is `artifacts/nurvaxt-progress-panel.apk`. Validation and artifact identity
are recorded in `verification.json`. Screenshots use the isolated `az.nurvaxt.alarm.test` package
and a synthetic timetable, without changing the emulator clock or user application data. The
preview omits the production group because it has no running service/group owner. Android may
show the test package name in its header. The connected Samsung also received an in-place update signed with its existing development certificate; see the phone verification below.

References: [Android custom notification limits](https://developer.android.com/develop/ui/views/notifications/custom-notification)
and [native Live Updates](https://developer.android.com/develop/ui/views/notifications/live-update).

Validation passed: TypeScript, 31 notification-related JavaScript tests, 19 native unit tests,
12 countdown instrumentation tests (including 48 notification combinations and 260/320/390 dp,
100/200% font, light/dark and 12/24-hour layout measurements), release build/vital lint,
APK signature continuity and both packaged notification layouts. Two screenshot frames confirm
that both native countdowns advance by seconds. Other manufacturers were not tested. Earlier emulator screenshots below record the first layout iteration; the current phone screenshots show the later inline times in both sizes.

- [Compact, light](screenshots/compact-light.png)
- [Expanded, light](screenshots/expanded-light.png)
- [Two seconds later](screenshots/expanded-light-seconds-later.png)
- [Compact, dark, 200% font](screenshots/compact-dark-200.png)
- [Expanded, dark, 200% font](screenshots/expanded-dark-200.png)
- [Ordinary state without kərahət](screenshots/ordinary-light.png)

## Connected Samsung follow-up

On the connected Samsung SM-G990E / Android 16, the saved Bakı timetable was preserved and
the real compact countdown showed `Əsr · 16:10`. At that stage both compact and expanded layouts added
the kərahət start beside its name. The matching phone update is
`artifacts/nurvaxt-progress-panel-phone.apk`; it uses the repository development key matching
the already-installed app. The separately kept release-key APK is for release-key installations.

Kərahət was demonstrated through the isolated test package, labelled `Önizləmə`, with a
`Nümunə` event and `Nümunə vaxtlar` header. It posts silently and expires within five minutes or at its fixed preview deadline, whichever comes first. The entry preview expires at its sample start; the standalone preview has no running countdown service.
The real phone clock, prayer plan, reminder settings, theme and font settings are not changed.
Only isolated notification layout/bitmap checks and preview mode run on the physical phone. No alarm, clock, sound, dismissal or app-data lifecycle tests run on the phone.
Screenshot crops retain the notification pixels and omit unrelated personal notifications.

The expanded app name belongs to Android's standard header and cannot be hidden with the
supported custom-notification APIs. No app-label change, private Samsung API or SDK downgrade
is used. Reference: [Android standard notification decoration](https://developer.android.com/about/versions/12/behavior-changes-12#custom-notifications).

- [Current compact prayer on the phone](phone/compact-actual.png)
- [Compact kərahət sample](phone/kerahat-compact.png)
- [Expanded kərahət sample](phone/kerahat-expanded.png)

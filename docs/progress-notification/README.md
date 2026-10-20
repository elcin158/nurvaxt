# Minimal progress notification

The ordinary Android countdown now uses the approved compact/expanded layout. Both views
contain a horizontal time track and native, per-second prayer and upcoming/active kərahət chronometers.
Both compact and expanded content show the scheduled times inline beside event names, such as `Məğrib · 18:30` and `Kərahət girməsinə · 18:17`. Scheduled times honor the saved 12/24-hour
format and kərahət starts are formatted in Asia/Baku.

Prayer digits inherit Android notification text colors (dark in light mode, light in dark mode).
Kərahət names and timers use accessible crimson/coral. There is no extra body logo, sun icon,
urgency caption, unit suffix, “qalıb”, “Başlanğıc” or “Kərahət intervalı” label. Screen-reader
descriptions retain the event meaning, scheduled times and estimated nature of kərahət.
During the sunrise end phase, `Günçıxma` distinguishes an end countdown from a prayer start.

The empty track is white in both themes, filling blue/cyan as time elapses.
The track maps the actual previous/next prayer timestamps to a shared scale. Real kərahət
intervals are clipped to that range, merged when they overlap, and shown in red, including their
upcoming portion. A thin white tick marks the current position; this is a read-only indicator.
Without a valid previous prayer the track stays neutral instead of inventing an elapsed fraction.
A separate kərahət timer appears before an interval only when its start is at or before the displayed prayer boundary. It shows `Kərahət girməsinə` until the start, then `Kərahət bitməsinə` until the end; expired and unrelated future intervals are hidden. The clock beside the label remains the interval start in both phases.
The existing minute refresh and exact solar-boundary updates remain in place; the system owns
both chronometers' per-second ticking.

The compact body stays within Android's 48 dp limit, including the upcoming/active kərahət row.
Timer columns have bounded widths. Kərahət digits are fitted to the full expected hour/minute/second format and row height before ticking, avoiding Chronometer autosize clipping when an approaching interval is more than an hour away. Prayer labels autosize; expanded names/times can wrap when
accessibility font sizes require it. The system owns the outer header, app name, icon and
expansion control. The duplicate name is absent from our content, but Android's app name is not
suppressed. Public Live Updates retain their native system template and existing promotion behavior;
this custom layout is for the ordinary expandable notification, including Samsung SDK 36.0.
The existing shared countdown/reminder group and single status-bar icon changes are preserved.

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
the real compact countdown showed `Əsr · 16:10`. Both compact and expanded layouts now add
the kərahət start beside its name too. The matching phone update is
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

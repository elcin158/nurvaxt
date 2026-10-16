# Architecture

Expo Router owns navigation; feature modules own prayer logic, reminders, locations, qibla
and settings. Strict TypeScript and Zod separate source input from application records.

| Concern                  | Implementation                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Offline records          | `src/database/repository.ts`, indexed `(locationId,date)` SQLite primary key                               |
| Schema                   | SQLite `user_version=1`, forward-only migration gate and metadata table                                    |
| Dataset install          | Semantic validation + SHA-256 before an exclusive replacement transaction                                  |
| Source acquisition       | Node/TypeScript CLI; no parsing/network in normal mobile use                                               |
| Query lifetime           | TanStack Query by city/date range; permanent local-package freshness                                       |
| Preferences              | Zustand persist + AsyncStorage; validated hydration and safe defaults                                      |
| Countdown                | Luxon absolute Asia/Baku timestamps, five-prayer domain engine                                             |
| Countdown rendering      | Hero and enabled kərahət card tick each second while focused/active                                        |
| Android status countdown | Native minute icon updates, system chronometer, durable verified timetable and next urgency-boundary alarm |
| Date rollover            | Local next-midnight timeout + foreground refresh, independent of displayed day                             |
| Android reminders        | Local Expo module, persistent native plan, next 32 AlarmManager timestamps                                 |
| iOS reminders            | Expo local notifications, maximum 60 future requests, diff reconciliation                                  |
| Qibla                    | Great-circle bearing from the city centre or an opt-in coarse position; levelled magnetometer heading      |
| Theme                    | Shared token/context palette with system appearance and bundled Manrope                                    |

Startup copies the prebuilt `prayer-times.db` asset when missing or when its bundle id differs from the app's, then verifies SQLite integrity, schema version and record count.
Invalid packages fail before deleting the old year's records; SQL errors roll back. Dataset
metadata is written in the same transaction. A future remote updater must apply a trusted
package, then invalidate `prayer-days` query keys and request reconciliation; no live remote
updater is enabled. Dataset bytes are trusted app assets, not unsigned downloaded data.

Canonical keys and reminders use Gregorian dates and Asia/Baku, regardless of device timezone.
Displayed historical navigation never changes notification preferences or the scheduling date.
After today's İşa the engine considers tomorrow's first daily prayer; a missing tomorrow stays
unavailable rather than jumping across a gap. Optional Hijri uses Intl `islamic-civil`, ±2 days,
is display-only and never affects alarms.

The hero keeps the next daily prayer as its main event. From verified İşa until the following
verified sunrise, it also shows a smaller sunrise countdown and progress. That progress spans
the whole night, including midnight and Sübh. Missing either endpoint hides the extra display.
`visibleFields` chooses the timetable rows and defaults to İmsak and the five daily prayers:
günçıxma, günbatımı and gecəyarısı mark the prayers' boundaries rather than prayers of their
own, so they stay off until GÖSTƏRİLƏN VAXTLAR turns them on. Stored preferences keep whatever
they already selected, and the last remaining row cannot be unchecked.
The optional `showKerahat` preference defaults off and persists across launches. Its Hanafi
solar intervals are display-only estimates anchored to distinct source fields, never Məğrib as a
sunset substitute: they run from sunrise, and up to Zöhr and actual sunset. `kerahatDurations`
stores the length of each period, defaulting to 45, 10 and 45 minutes. Settings support exact
whole minutes from 0 to 120 or five-minute steps; zero leaves that period out entirely, in the
app and in the native plan alike. Nothing announces kərahət in advance: an interval is reported
only while it runs, and it shows the time to its end.
Settings screens scroll with `keyboardShouldPersistTaps="handled"`, so a tab, button or header
close takes the tap without blurring the focused field. The period minutes and the quiet-hours
times are therefore stored as soon as the typed text is usable, instead of waiting for a blur that
never arrives when the user simply leaves the screen.
The native plan receives separate verified sunrise and kərahət endpoints. Its existing visual
boundary alarm also advances those displays while JS is absent; prayer reminder events stay separate.

Android receives the complete future plan for available records, but registers at most 32
distinct timestamps. Native receivers consume due events and refill while JS is absent.
Coincident reminders combine into one message, preventing duplicate alarms at that timestamp.
Sound/vibration-specific immutable channel identities are versioned. Serialization avoids
overlapping preference/city reconciliation; foreground/startup provides eventual latest state.
At-time alerts for all five prayers default on independently of selected advance offsets.
The optional silent `CountdownService` uses a separate durable five-prayer timetable, native
minute updates and a system chronometer. It does not drive prayer-notification delivery.
Its status icon changes shape at 30/15 minutes; disabling it removes only that service and its
next threshold alarm. Boot/time/package receivers restore both native plans independently.

Browser preview has a separate repository using the same checked-in validated records. It is
not a native storage/scheduling test. Source assets remain developer evidence; normal users
see coverage, source attribution and readable missing-data states.

No backend, microservices, account, analytics, background GPS,
push token registration or paid API dependency. Widgets/Qibla/backup are future features.

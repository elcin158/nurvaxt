# Native verification matrix

Record OS/device/build/date and observed behavior for every row before release. Automated
domain tests and a successful APK build are not equivalent to device lifecycle verification.

| Scenario                                | Expected result                                                | Status                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android clean launch                    | Onboarding → verified Bakı records                             | Passed on API 35 emulator; debug October, signed release October–December; 8 Oct 2026                                                               |
| Android foreground reminder             | Notification, correct city/time/text/channel                   | API 35 native test delivered in debug and signed release; release plan 423 requests / 32 timestamps, ADB grants. Physical timing/channel QA pending |
| Android background                      | Native alarm delivers without active JS                        | Passed in signed 1.0.2 API 35 emulator: Zöhr at-time delivery after task removal; ADB permission grants; physical-device QA pending                 |
| Android normal swipe-away               | PendingIntent alarm survives ordinary task removal             | Passed in signed 1.0.2 API 35 emulator: ongoing service and countdown remained, then native at-time prayer alert delivered                          |
| Android persistent countdown            | Numerical status icon, native chronometer, 30/15-minute shapes | Passed in signed 1.0.2 API 35 emulator; screenshots show circle/diamond and the in-app coral urgency state                                          |
| Android countdown disable               | Remove countdown while retaining prayer alarms                 | Passed in signed 1.0.2 API 35 emulator; disable/re-enable verified                                                                                  |
| Android force-stop                      | No guarantee; future alarms restored after relaunch            | Pending                                                                                                                                             |
| Android reboot                          | Saved future plan is restored after normal boot/unlock         | Pending                                                                                                                                             |
| Android Doze                            | Observe exact/inexact and close-offset rate limits             | Pending                                                                                                                                             |
| Android battery saver / OEM restriction | Record vendor-specific delays                                  | Pending                                                                                                                                             |
| Notification denial                     | Timetable usable, denied state, settings shortcut              | Pending                                                                                                                                             |
| Exact-access denial/revocation          | Inexact fallback, visible status, restore on grant             | Pending                                                                                                                                             |
| Tone/vibration changes                  | New channel, system overrides respected                        | Pending                                                                                                                                             |
| City/preferences change                 | No stale prior-city requests; latest plan retained             | Pending                                                                                                                                             |
| iOS foreground/background               | Local notification authorization/presentation                  | Pending                                                                                                                                             |
| iOS terminated app                      | Existing scheduled requests deliver                            | Pending                                                                                                                                             |
| iOS denied/provisional permission       | Accurate status, no repeated prompt                            | Pending                                                                                                                                             |
| iOS 60-request limit                    | Earliest events retained, replenished on next launch           | Pending                                                                                                                                             |
| Device timezone changes                 | All official values remain Asia/Baku                           | Pending                                                                                                                                             |
| Device wall-clock changes               | Countdown recomputes, native plan reconciles                   | Pending                                                                                                                                             |
| Midnight/end-of-month                   | Tomorrow's published first prayer or missing-data state        | Pending                                                                                                                                             |
| Offline cold launch                     | Bundle/SQLite/preferences usable without network               | Signed release 1.0.1 passed on API 35 emulator with Wi-Fi/data disabled and no ADB reverse; physical-device QA pending                              |
| Missing city/date                       | No fabricated timetable/countdown/reminders                    | January 2027 unavailable state verified in release emulator; other cities and native countdown boundaries pending                                   |
| Corrupted database/update               | Clear failure; invalid update leaves old data intact           | Pending                                                                                                                                             |
| Small phone / large text                | Scrollable cards, no clipped text, touch targets               | Pending                                                                                                                                             |
| Screen reader / reduced motion          | Meaningful labels and subdued/system-disabled entrance         | Pending                                                                                                                                             |

Independent human verification must compare every transcribed cell, not only the
documented sample rows. Automated tests cover the parser/review equality, checksum,
Gregorian dates, sparse rollover, countdown, offsets, IDs/deduplication, reconciliation,
preference persistence, calendar navigation and SQLite artifact integrity/index use.

Native startup additionally created schema 1 SQLite on the API 35 emulator. A snapshot of its
database and WAL passed `quick_check`; all 31 rows / 279 values matched that initial October bundle.
See `android-smoke-result.json`, `android-database-result.json` and the captured home screen.
The development APK needs Metro; the separate signed-release results below establish
emulator offline cold launch. Physical devices, reboot/Doze delivery and performance targets remain pending.

`android-notification-result.json` records successful delivery through the same native queue
used by prayer reminders. The test event was consumed and the remaining 118 events retained
32 registered timestamps, with no native scheduling error. Permission UX was not verified;
ADB supplied the test-only grants. Background process-death delivery remains unverified:
the attempted harness did not establish that its test request was durably scheduled before
terminating the process. This is not evidence of either successful or failed background delivery.

Signed release **1.0.1 / versionCode 2** was tested separately on the same API 35 emulator,
8 October 2026, with Wi-Fi/mobile data disabled and no ADB reverse mappings. Clean launch
and cold relaunch opened the official home without Metro; November and December calendars
opened, 31 December displayed all nine times including `00:00`, and January 2027 showed
the unavailable state. The actual release SQLite snapshot matched all **92 rows / 828 times**.
The minified native foreground test alarm delivered with **423 future requests / 32 registered
timestamps**, using ADB permission grants. No lifecycle or physical-device result is inferred.
See `android-release-result.json`, `android-release-database-result.json` and
`android-release-notification-result.json`.

Signed release **1.0.2 / versionCode 3**, 9 October 2026: all **41 Jest checks**,
TypeScript, ESLint, native Kotlin compilation, Android release lint and signing verification passed.
`android-countdown-result.json` records the matching APK hash and successful API 35 emulator
checks for five daily at-time alerts, the system countdown chronometer, 30/15-minute transitions,
ordinary task removal, native Zöhr delivery after removal, automatic Əsr rollover and independent
countdown disable/re-enable. Device wall-clock changes were simulated within verified records;
the original emulator clock was restored afterward. Permission grants were supplied by ADB.
The updated bottom navigation and status-bar number were visually inspected in
`screenshots/android-countdown-home-15-minutes.png`. Physical devices, reboot and Doze remain
unverified for this release; earlier offline/SQLite checks above belong to 1.0.1.

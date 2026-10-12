# Modern persistent notification

The native prayer card groups the prayer name/time on the left and the live countdown on the
right. The sunrise section has been removed from the panel and from the home card alike: first the
tall night arc with its moving sun, then the compact line and meter that replaced it.

The panel itself stays monochrome. Exactly one accent is visible at a time — the urgency blue,
amber or coral on the symbol, the large countdown, its stage text and the prayer progress track.
The warm sunrise surface, the gold sunrise text and the amber kərahət timer have been removed:
those rows inherit Android's notification text styles, sit on hairline dividers instead of tinted
surfaces, and the sunrise meter uses a neutral fill so it never competes with the accent.

Ordinary Android notifications use the system expansion control, including Samsung SDK 36.0.
The developer-test live card and custom toggle have been removed again at the user's request.
The screenshots and measurements below describe the earlier design test, including the previous
sunrise arc. Public Android Live Updates use a native system card in the last 30 minutes on SDK
36.1+; see `../notifications.md` for current behavior.

## Historical design verification

- TypeScript and targeted ESLint checks passed.
- Existing UI/solar suites: 20 tests passed.
- Native solar/status-time suites: 7 tests passed.
- Android release APK and release lint checks passed.
- Connected Samsung SM-G990E (Android 16): initial collapsed state, arrow expansion, arrow
  collapse, sunrise arc visibility and a continuously advancing chronometer were verified.
- The collapsed card measures 348 px high versus 665 px expanded on this 480-dpi phone.
- A separate minute-refresh observation was inconclusive during concurrent phone interaction;
  the manual open/close and continuous timer checks above passed.
- The update retained Bakı, the 05:29 prayer time and existing app data. The phone clock and
  system settings were not changed.
- The phone had a development-signed installation; the same release build was also signed with
  its matching development certificate for the in-place device update. The separately saved
  release-signed APK remains available in `artifacts/nurvaxt-modern-notifications.apk`.
- Dark system mode, enlarged system fonts and other manufacturers still need physical visual QA.

`collapse-verification.json` records the device checks. `screenshots/collapsed-phone.png` and
`screenshots/expanded-phone.png` show the final toggle states. `compact-before.png` is the old
compact view. Earlier panel XML and `verification.json` document the first design pass.

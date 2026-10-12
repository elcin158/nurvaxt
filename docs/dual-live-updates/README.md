# Historical dual Live notification experiment

This experiment was reverted at the user's request on 12 October 2026. Samsung SDK 36.0 now
keeps the ordinary expandable card, and its developer-test switch is no longer read by the app.
The SDK 36.1+ public path and foreground-service startup fix remain. The description and checks
below record the experiment, not the current implementation. No successful device visibility
check was established for that dual-path build.

The experimental release supported public Android Live Updates and the optional Samsung developer-test surface.
Public SDK 36.1+ always takes precedence: the existing last-30-minute ProgressStyle, permission
check and dismissal suppression remain in place. Those systems never receive Samsung private
extras, even when the public card is unavailable. Other manufacturers retain the ordinary card.

Samsung SDK 36.0 reads the existing secure `enable_notification_nowbar_test` switch. If enabled,
private ongoing-activity extras supply a compact custom live card with an arrow for opening and
closing prayer/solar details. The same ordinary compact/expanded layouts still back the fallback.
The app does not enable Developer options or write the switch. The optional settings page calls
this a Samsung test, keeps public promotion separate, and does not invite it during onboarding.

The public system card is expanded and uncollapsible. The Samsung custom card can expand/collapse;
the ordinary card uses Android's system expansion control. Private Samsung behavior depends on
its system build and is not a public Android compatibility guarantee.

TypeScript and targeted ESLint checks passed, along with 45 JavaScript and 13 native tests.
The release build and its vital lint checks passed. Device installation and visual verification
were left to the user, as requested. No developer setting or phone clock was changed. The earlier
SDK 36.1 system-promotion evidence is in `../live-updates` and is tied to that earlier APK hash;
it does not establish device verification of this newer dual-path build.

[Android Live Updates](https://developer.android.com/develop/ui/views/notifications/live-update) ·
[Promotion request API](https://developer.android.com/reference/android/app/Notification#EXTRA_REQUEST_PROMOTED_ONGOING)

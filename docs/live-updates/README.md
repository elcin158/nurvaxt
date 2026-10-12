# Public Android Live Updates release

This directory records the original public-only release verification. The current implementation
uses this public path again: the later Samsung developer-test experiment has been reverted at the
user's request. Unsupported phones keep the ordinary expandable countdown card. The service
also acknowledges foreground starts before decoding the plan or preparing notification artwork.
SDK 36.1+ can promote the user-enabled prayer countdown in the final 30 minutes. Earlier
hours, unsupported systems and disabled promotion retain the modern expandable ordinary card,
including the sunrise meter. A public native ProgressStyle shows amber/coral interval progress;
SystemUI renders the countdown seconds. The candidate must pass hasPromotableCharacteristics().

The optional setup guide opens the dedicated public action where available, falling back to the
normal app notification page with its Live updates switch. It distinguishes permission from the
actual FLAG_PROMOTED_ONGOING on the active countdown. Unpin and delete intents persist the
current prayer timestamp to avoid re-promoting a dismissed event. The next prayer can promote
when its own imminent window starts.

## Verification

- TypeScript, targeted ESLint and formatting passed; 43 JavaScript and 11 native tests passed.
- Signed, non-debuggable release APK and release vital lint passed. The artifact metadata records
  the release certificate, four configured ABIs and bundled JavaScript/reminder sound.
- A temporary instrumentation APK, signed with the same release identity, invoked the actual
  R8-compiled production notification builder on a disposable SDK 36.1 Google APIs emulator.
  Its synthetic 20-minute prayer was not written into the app timetable. The system assigned
  PROMOTED_ONGOING; the native ProgressStyle had no custom RemoteViews. The real release
  dismissal PendingIntent reached the manifest receiver and prevented the same prayer from
  re-promoting. The temporary dismissed timestamp and probe notification were cleaned up.
- Turning Live updates off through normal Android app settings made the production builder
  return both compact and expanded custom views. A separately built native candidate was
  denied promotion by the system. Permission was restored, and the app's own settings
  button opened that normal settings page.
- Samsung SM-G990E: final release code was installed without clearing data, signed with the
  certificate already on the phone. Installed APK hash matched. SDK 36.0 uses the ordinary
  ongoing card. The phone clock and system settings were unchanged.

`verification.json` ties these results to the final release APK hash. `promoted-result.txt`,
`denied-result.txt`, the isolated notification record and the two screenshots retain evidence.
Android's promoted card is expanded and uncollapsible. Other manufacturers, dark mode and
large fonts still need physical visual QA. Earlier Samsung developer-test screenshots are
historical and do not establish public API support.

[Live Updates](https://developer.android.com/develop/ui/views/notifications/live-update) ·
[Promotion request API](https://developer.android.com/reference/android/app/Notification#EXTRA_REQUEST_PROMOTED_ONGOING)

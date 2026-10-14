# Restored crescent in notification icons

## Intermittent crescent-only status icon

Android's automatic notification summary can use the app's adaptive monochrome launcher icon
when the child notifications have different icons. The existing launcher monochrome was
generated from a crescent-only SVG. Saved Samsung diagnostics in
`../live-updates/s21-fe-investigation/active-notifications.txt` record a NurVaxt automatic group
summary using the launcher icon instead of the bitmap notification icon. This provides a code
and diagnostic explanation for the reported intermittent moon-only appearance.

The generator now derives `assets/monochrome.png` from the full original lettering and crescent,
with transparent padding for the adaptive safe circle. All five launcher monochrome densities
are refreshed. The asset has eight connected parts instead of the old moon's single part, and
every opaque pixel fits within the 66/108 safe circle. Results are in
`autogroup-icons-verified.json`; `autogroup-icon-preview.png` is an enlarged local rendering.
TypeScript, generator ESLint/Prettier and Android debug resource packaging passed. All five
packaged monochrome density images match the refreshed source files byte for byte.
The connected device during this investigation was a Lenovo tablet with no active NurVaxt
notification, so the supplied Samsung screenshot's live notification state was not verified.

Android's selection is documented in its
[GroupHelper source](https://android.googlesource.com/platform/frameworks/base/+/master/services/core/java/com/android/server/notification/GroupHelper.java).

## Ordinary notification artwork

Notification generation now keeps the original crescent above the NurVaxt lettering. The
earlier stepped mask removed it; the pipeline now fits the full `assets/mark-mono.png` into
the existing transparent 96 px bitmap. The native countdown, startup, reminders, Live Updates
and all five Expo notification densities use the restored artwork.

The asset check detects eight separate components, including the crescent above the seven
letters; the previous icon contained seven. Native and Expo source PNGs match. Android
notification densities are 24, 36, 48, 72 and 96 px with transparency. TypeScript, asset-generator
ESLint/Prettier, all 15 native unit tests and the Android instrumentation APK build passed.
Instrumentation tests were compiled but were not run on a device for this change.

`status-icon-preview.png` is a local before/after rendering of the standalone icon at 24 px,
enlarged four times for inspection. It is not a device screenshot. Results are recorded in
`assets-verified.json`. A newly built application APK must be installed to update phone icons.

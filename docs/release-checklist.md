# Release gates

- [x] Acquire all 222 requested October–December 2026 source images; verify 74-region coverage,
      independent OCR/glyph agreement and explicit visual header/flag audits before import.
- [ ] Obtain independent human review of the 61,272 packaged time cells before public release.
- [ ] Add other intended months and include 2027 before 2026 expires.
- [ ] Confirm source redistribution permission with QMİ; preserve attribution/independence.
- [ ] Verify NurVaxt brand/trademark/domain and `az.nurvaxt.app` store identifier availability.
- [ ] Add real operator identity/contact to privacy policy and store metadata; no fake contact.
- [ ] Review Android exact-alarm policy eligibility and store permission declarations.
- [ ] Declare/review the optional countdown `specialUse` foreground service in Play Console.
- [ ] Complete the native test matrix, especially reboot, Doze, OEM restrictions and force-stop.
- [ ] Build/run signed release Android AAB with actual production signing credentials.
- [x] Build and verify a dedicated-key signed local release APK; emulator offline launch,
      SQLite values and native foreground test notification verified (1.0.1 / versionCode 2).
- [ ] Build/test iOS on macOS/Xcode or EAS, including the 60-request replenishment boundary.
- [ ] Check independent human Azerbaijani copy review, screen readers, contrast and large fonts.
- [ ] Measure release cold start, memory, frame timing and battery on target phones.
- [ ] Review dependency audit findings without blindly upgrading incompatible native libraries.
- [ ] Complete privacy/data-safety forms with actual behavior and validate operator terms,
      including the optional coarse-location origin used by the Qibla screen.
- [ ] Verify the Qibla heading against a known bearing on real Android and iOS hardware,
      including the gravity-sign assumption in `useCompassHeading` and the Android-only
      system prompt that switches the location service back on.
- [ ] Include coverage/end-date information in support material; no full-year claim yet.
- [ ] Test atomic upgrade from an installed older dataset and recoverable database errors.

Official Ramadan/iftar semantics, azan recordings and widgets are optional future scope. They are not described as delivered or verified. No public publish/store submission
has been performed by this development task.

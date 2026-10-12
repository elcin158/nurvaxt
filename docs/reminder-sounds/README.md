# Android system notification sound preview

The Standard option previously handed `content://settings/system/notification_sound` to
`expo-audio`'s media player and immediately displayed “Səslənir…”. That path could fail to
resolve a protected system sound and also used media volume rather than notification volume.

Standard now uses Android's `RingtoneManager` through `NurvaxtAlarm`. Android resolves its
notification URI/cache and can delegate playback to the system ringtone service. The preview
uses notification audio attributes, confirms native playback before showing the active state,
and reports an unset system tone or zero notification volume in Azerbaijani. Bundled tones
retain their existing player and saved preferences.

New selections, the stop button, silent selection, screen exit and backgrounding stop both
players. Native lifecycle cleanup and a four-second native timeout cover suspended JS. The UI
observes natural ringtone completion without reacting to a previous custom player's finish event.

Verification: all 124 Jest tests, TypeScript and ESLint passed. Five native tests passed on the
SDK 36 emulator: real default playback/stop, replacement, silent system selection, muted
notification volume, and four-second cleanup of a system ringtone longer than six seconds.
The tests restore the emulator's tone and volume. Their WRITE_SETTINGS permission exists only
in the instrumentation APK; the signed release does not contain it.

The release APK's signature matches the existing release identity. Its updated native methods,
embedded JS, three supported ABIs and packaged countdown resources were verified. Emulator
host audio was disabled; speaker audibility on the affected physical phone remains unverified.
The installed release's Standard listen button started an unmuted `USAGE_NOTIFICATION`
MediaPlayer, and the active preview UI was visually checked.

- [Native test output](android-system-preview-tests.txt)
- [Installed release audio state](android-release-audio-state.txt)
- [Standard preview screenshot](screenshots/android-standard-playing.png)
- [Release verification](../../artifacts/nurvaxt-standard-sound-fix.json)
- [Android RingtoneManager API](https://developer.android.com/reference/android/media/RingtoneManager)
- [Android Ringtone audio attributes API](<https://developer.android.com/reference/android/media/Ringtone#setAudioAttributes(android.media.AudioAttributes)>)

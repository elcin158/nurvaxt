package az.nurvaxt.alarm

import android.content.Context
import android.media.AudioManager
import android.media.MediaMetadataRetriever
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/** Changes/restores sound settings only on a disposable Android emulator. */
class SystemSoundPreviewTest {
  companion object {
    lateinit var context: Context
  }

  private lateinit var preview: SystemSoundPreview
  private lateinit var audio: AudioManager
  private var originalSound: Uri? = null
  private var originalVolume = 0

  @Before
  fun setup() {
    check(Build.HARDWARE == "ranchu" || Build.HARDWARE == "goldfish") { "Emulator-only test" }
    audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    originalSound = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_NOTIFICATION)
    assertNotNull("Emulator must have a default notification sound", originalSound)
    originalVolume = audio.getStreamVolume(AudioManager.STREAM_NOTIFICATION)
    audio.setStreamVolume(AudioManager.STREAM_NOTIFICATION, audio.getStreamMaxVolume(AudioManager.STREAM_NOTIFICATION), 0)
    preview = SystemSoundPreview(context)
  }

  @After
  fun restore() {
    if (!::preview.isInitialized) return
    preview.stop()
    RingtoneManager.setActualDefaultRingtoneUri(context, RingtoneManager.TYPE_NOTIFICATION, originalSound)
    audio.setStreamVolume(AudioManager.STREAM_NOTIFICATION, originalVolume, 0)
  }

  @Test
  fun systemNotificationSoundReallyStartsAndStops() {
    assertEquals("playing", preview.play())
    assertTrue(preview.isPlaying())
    preview.stop()
    assertFalse(preview.isPlaying())
  }

  @Test
  fun replacingPreviewRemainsStoppable() {
    assertEquals("playing", preview.play())
    assertEquals("playing", preview.play())
    assertTrue(preview.isPlaying())
    preview.stop()
    assertFalse(preview.isPlaying())
  }

  @Test
  fun silentSystemSelectionDoesNotPlayAFallbackTone() {
    RingtoneManager.setActualDefaultRingtoneUri(context, RingtoneManager.TYPE_NOTIFICATION, null)
    assertEquals("silent", preview.play())
    assertFalse(preview.isPlaying())
  }

  @Test
  fun mutedNotificationVolumeIsReported() {
    audio.setStreamVolume(AudioManager.STREAM_NOTIFICATION, 0, 0)
    assertEquals("muted", preview.play())
    assertFalse(preview.isPlaying())
  }

  @Test
  fun nativePlaybackEndsWithinFourSeconds() {
    // Use a real system tone longer than the limit to distinguish cleanup from natural completion.
    val manager = RingtoneManager(context).apply { setType(RingtoneManager.TYPE_RINGTONE) }
    var longTone: Uri? = null
    val cursor = manager.cursor
    try {
      for (index in 0 until cursor.count) {
        val uri = manager.getRingtoneUri(index)
        val metadata = MediaMetadataRetriever()
        try {
          metadata.setDataSource(context, uri)
          val duration = metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0
          if (duration > 6000) {
            longTone = uri
            break
          }
        } finally {
          metadata.release()
        }
      }
    } finally {
      cursor.close()
    }
    assertNotNull("Emulator must have a system ringtone longer than six seconds", longTone)
    RingtoneManager.setActualDefaultRingtoneUri(context, RingtoneManager.TYPE_NOTIFICATION, longTone)
    assertEquals("playing", preview.play())
    Thread.sleep(3500)
    assertTrue(preview.isPlaying())
    Thread.sleep(700)
    assertFalse(preview.isPlaying())
  }
}

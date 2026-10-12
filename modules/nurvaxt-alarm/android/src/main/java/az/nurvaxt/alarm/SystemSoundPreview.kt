package az.nurvaxt.alarm

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper

/** System notification URIs need Android's ringtone resolver/cache and remote playback fallback. */
class SystemSoundPreview(private val context: Context) {
  private val handler = Handler(Looper.getMainLooper())
  private var ringtone: Ringtone? = null
  private val timeout = Runnable { stop() }

  @Synchronized
  fun play(): String {
    stop()
    return try {
      if (RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_NOTIFICATION) == null) {
        return "silent"
      }
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      if (audio.getStreamVolume(AudioManager.STREAM_NOTIFICATION) == 0) return "muted"
      val sound = RingtoneManager.getRingtone(context, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
        ?: return "unavailable"
      ringtone = sound
      sound.audioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      if (Build.VERSION.SDK_INT >= 28) sound.isLooping = false
      sound.play()
      if (!sound.isPlaying) {
        stop()
        "unavailable"
      } else {
        // Also bound playback natively if JS is suspended or the screen disappears.
        handler.postDelayed(timeout, 4000)
        "playing"
      }
    } catch (_: Exception) {
      stop()
      "unavailable"
    }
  }

  @Synchronized
  fun isPlaying(): Boolean = try {
    ringtone?.isPlaying == true
  } catch (_: Exception) {
    stop()
    false
  }

  @Synchronized
  fun stop() {
    handler.removeCallbacks(timeout)
    val previous = ringtone
    ringtone = null
    try {
      previous?.stop()
    } catch (_: Exception) {
      // Lifecycle cleanup must not prevent the module from being released.
    }
  }
}

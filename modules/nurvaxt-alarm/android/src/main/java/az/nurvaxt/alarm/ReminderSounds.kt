package az.nurvaxt.alarm

import android.content.Context
import android.media.RingtoneManager
import android.net.Uri

/** Shared by channel creation and older Android's per-notification sound. */
object ReminderSounds {
  val ids = setOf("silent", "default", "tone", "soft", "bell", "melody")

  fun uri(context: Context, sound: String): Uri? = when (sound) {
    "silent" -> null
    "tone", "soft", "bell", "melody" -> Uri.parse("android.resource://${context.packageName}/raw/nurvaxt_$sound")
    else -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
  }
}

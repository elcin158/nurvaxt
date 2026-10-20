package az.nurvaxt.alarm

import android.app.NotificationManager
import android.content.Context
import android.os.Build

/** Public Android Live Updates check; the user manages the switch in system settings. */
object LiveNotificationAccess {
  private fun supported(): Boolean = Build.VERSION.SDK_INT >= 36 &&
    Build.VERSION.SDK_INT_FULL >= CountdownLiveUpdate.MIN_SDK_FULL

  fun allowed(context: Context): Boolean = supported() && runCatching {
    context.getSystemService(NotificationManager::class.java).canPostPromotedNotifications()
  }.getOrDefault(false)
}

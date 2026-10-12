package az.nurvaxt.alarm

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings

/** Public Android access only. Settings remain a manual, app-specific user choice. */
object LiveNotificationAccess {
  // Some system builds expose Live Updates only inside the public app notification page.
  private const val MANAGE_PROMOTED = "android.settings.MANAGE_APP_PROMOTED_NOTIFICATIONS"

  private fun supported(): Boolean = Build.VERSION.SDK_INT >= 36 &&
    Build.VERSION.SDK_INT_FULL >= CountdownLiveUpdate.MIN_SDK_FULL

  fun allowed(context: Context): Boolean = supported() && runCatching {
    context.getSystemService(NotificationManager::class.java).canPostPromotedNotifications()
  }.getOrDefault(false)

  private fun promotedIntent(context: Context): Intent? = listOf(
    Intent(MANAGE_PROMOTED).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
    Intent(MANAGE_PROMOTED, Uri.fromParts("package", context.packageName, null))
      .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
      .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
  ).firstOrNull { it.resolveActivity(context.packageManager) != null }

  fun status(context: Context): Map<String, Any> {
    val enabled = allowed(context)
    val canOpenSettings = supported() && promotedIntent(context) != null
    val promoted = Build.VERSION.SDK_INT >= 36 && runCatching {
      context.getSystemService(NotificationManager::class.java).activeNotifications.any {
        it.id == CountdownState.NOTIFICATION_ID &&
          it.notification.flags and Notification.FLAG_PROMOTED_ONGOING != 0
      }
    }.getOrDefault(false)
    return mapOf(
      "mode" to if (supported()) "standard" else "unsupported",
      "enabled" to enabled, "canOpenSettings" to canOpenSettings, "promoted" to promoted,
      "notificationsAllowed" to CountdownState.allowed(context),
    )
  }

  fun openSettings(context: Context): Boolean {
    if (!supported()) return false
    val intent = promotedIntent(context) ?: return false
    return runCatching {
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }.getOrDefault(false)
  }
}

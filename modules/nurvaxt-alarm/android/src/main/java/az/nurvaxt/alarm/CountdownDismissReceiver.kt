package az.nurvaxt.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.app.PendingIntent

/** Restore the enabled ordinary card; Live Update dismissal still demotes the current prayer. */
class CountdownDismissReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == RESTORE_COUNTDOWN) {
      CountdownState.restoreDismissedNotification(context.applicationContext)
      return
    }
    val prayer = intent.getLongExtra("prayer", 0)
    if (prayer <= 0) return
    CountdownState.prefs(context).edit().putLong(CountdownLiveUpdate.DISMISSED_PRAYER, prayer).apply()
    CountdownState.sync(context.applicationContext)
  }

  companion object {
    private const val RESTORE_COUNTDOWN = "az.nurvaxt.alarm.RESTORE_COUNTDOWN"

    fun restoreIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
      context, 7405, Intent(context, CountdownDismissReceiver::class.java).setAction(RESTORE_COUNTDOWN),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}

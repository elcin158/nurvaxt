package az.nurvaxt.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Retain the countdown's shared icon, or drop the owner when neither card remains. */
class ReminderDismissReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    CountdownNotification.syncGroupSummary(context.applicationContext)
  }
}

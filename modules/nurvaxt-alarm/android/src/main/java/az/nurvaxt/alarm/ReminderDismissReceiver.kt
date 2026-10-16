package az.nurvaxt.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Swiping a reminder away can leave the group summary with nothing left to own. */
class ReminderDismissReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    CountdownNotification.pruneGroupSummary(context.applicationContext)
  }
}

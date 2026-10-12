package az.nurvaxt.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Both Unpin and system dismissal keep this prayer in the ordinary countdown surface. */
class CountdownDismissReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val prayer = intent.getLongExtra("prayer", 0)
    if (prayer <= 0) return
    CountdownState.prefs(context).edit().putLong(CountdownLiveUpdate.DISMISSED_PRAYER, prayer).apply()
    CountdownState.sync(context.applicationContext)
  }
}

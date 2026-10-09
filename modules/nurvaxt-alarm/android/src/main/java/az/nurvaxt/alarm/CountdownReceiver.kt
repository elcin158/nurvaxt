package az.nurvaxt.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class CountdownReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    CountdownState.sync(context.applicationContext)
  }
}

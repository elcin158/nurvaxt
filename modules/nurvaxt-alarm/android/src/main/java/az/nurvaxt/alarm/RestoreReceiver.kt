package az.nurvaxt.alarm
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.concurrent.Executors
class RestoreReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val pending = goAsync()
    executor.execute {
      try {
        try { AlarmQueue.refill(context.applicationContext) } catch (_: Exception) { /* Persisted for diagnostics. */ }
        CountdownState.sync(context.applicationContext)
      } finally { pending.finish() }
    }
  }
  companion object { private val executor = Executors.newSingleThreadExecutor() }
}

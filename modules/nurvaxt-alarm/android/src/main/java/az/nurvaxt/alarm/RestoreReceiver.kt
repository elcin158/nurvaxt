package az.nurvaxt.alarm
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import java.util.concurrent.Executors
class RestoreReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      // Numeric layout IDs can change between debug/release APKs. Remove the old card before refill.
      NotificationManagerCompat.from(context).cancel(CountdownState.NOTIFICATION_ID)
    }
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

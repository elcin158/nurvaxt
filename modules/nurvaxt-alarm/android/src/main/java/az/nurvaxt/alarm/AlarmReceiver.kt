package az.nurvaxt.alarm
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.concurrent.Executors
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val pending = goAsync()
    executor.execute { try { AlarmQueue.deliver(context.applicationContext, intent.getLongExtra("timestamp", -1)) } catch (_: Exception) { /* Diagnostics are persisted by the queue. */ } finally { pending.finish() } }
  }
  companion object { private val executor = Executors.newSingleThreadExecutor() }
}

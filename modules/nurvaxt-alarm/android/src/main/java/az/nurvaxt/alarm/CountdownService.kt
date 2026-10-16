package az.nurvaxt.alarm

import android.app.Notification
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/** Native minute (final-minute second) updates survive task removal; no JS timer or wake lock. */
class CountdownService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var foreground = false
  private var plan: CountdownPlan? = null
  private var armedPrayer: Long? = null
  private val tick = Runnable { refresh() }
  private val screen = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) { refresh() }
  }

  override fun onCreate() {
    super.onCreate()
    ContextCompat.registerReceiver(this, screen, IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_ON)
      addAction(Intent.ACTION_USER_PRESENT)
    }, ContextCompat.RECEIVER_NOT_EXPORTED)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      // Acknowledge every startForegroundService delivery before reading preferences, parsing
      // the plan or building bitmap/RemoteViews content. Never re-post cached custom layouts.
      promote(CountdownNotification.startup(this))
      plan = CountdownState.read(this)
      armedPrayer = null
      refresh()
    } catch (error: Exception) { fail(error) }
    return if (foreground) START_STICKY else START_NOT_STICKY
  }

  private fun promote(notification: Notification) {
    ServiceCompat.startForeground(
      this, CountdownState.NOTIFICATION_ID, notification,
      if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0,
    )
    foreground = true
  }

  private fun refresh() {
    handler.removeCallbacks(tick)
    try {
      val now = System.currentTimeMillis()
      val currentPlan = plan
      val prayer = currentPlan?.takeIf { it.enabled && CountdownState.allowed(this) }
        ?.let { CountdownState.next(it, now) }
      if (prayer == null || currentPlan == null) {
        CountdownState.cancelBoundary(this)
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        foreground = false
        CountdownState.prefs(this).edit().putBoolean("active", false).apply()
        stopSelf()
        return
      }
      val notification = CountdownNotification.build(this, currentPlan, prayer, now)
      if (!foreground) {
        promote(notification)
      } else {
        NotificationManagerCompat.from(this).notify(CountdownState.NOTIFICATION_ID, notification)
      }
      CountdownNotification.pruneGroupSummary(this)
      if (armedPrayer != prayer.timestamp) {
        CountdownState.armBoundary(this, currentPlan, prayer, now)
        armedPrayer = prayer.timestamp
      }
      CountdownState.prefs(this).edit().putBoolean("active", true).remove("lastError").apply()
      // Align to the next change of the status-bar number and to the prayer boundary, including
      // resume after sleep. The final minute counts seconds, but only while someone can see it:
      // with the screen off the service waits out the minute and ACTION_SCREEN_ON refreshes.
      val left = prayer.timestamp - now
      val power = getSystemService(Context.POWER_SERVICE) as PowerManager
      val step = if (left <= 60_000 && power.isInteractive) 1_000L else 60_000L
      handler.postDelayed(tick, (left % step).let { if (it == 0L) step else it })
    } catch (error: Exception) { fail(error) }
  }

  private fun fail(error: Exception) {
    Log.e("NurvaxtCountdown", "Countdown service failed", error)
    CountdownState.prefs(this).edit().putBoolean("active", false)
      .putString("lastError", error.message ?: error.javaClass.simpleName).apply()
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    foreground = false
    stopSelf()
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    unregisterReceiver(screen)
    CountdownState.prefs(this).edit().putBoolean("active", false).apply()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}

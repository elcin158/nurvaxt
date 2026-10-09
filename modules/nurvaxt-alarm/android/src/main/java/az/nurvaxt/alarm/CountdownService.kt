package az.nurvaxt.alarm

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
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/** Native minute updates survive task removal; no JS timer, network or wake lock is needed. */
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
      plan = CountdownState.read(this)
      armedPrayer = null
      refresh()
    } catch (error: Exception) { fail(error) }
    return if (foreground) START_STICKY else START_NOT_STICKY
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
        ServiceCompat.startForeground(
          this, CountdownState.NOTIFICATION_ID, notification,
          if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0,
        )
        foreground = true
      } else NotificationManagerCompat.from(this).notify(CountdownState.NOTIFICATION_ID, notification)
      if (armedPrayer != prayer.timestamp) {
        CountdownState.armBoundary(this, prayer, now)
        armedPrayer = prayer.timestamp
      }
      CountdownState.prefs(this).edit().putBoolean("active", true).remove("lastError").apply()
      // Align to the remaining-minute change and prayer boundary, including resume after sleep.
      handler.postDelayed(tick, ((prayer.timestamp - now) % 60_000).let { if (it == 0L) 60_000 else it })
    } catch (error: Exception) { fail(error) }
  }

  private fun fail(error: Exception) {
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

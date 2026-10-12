package az.nurvaxt.alarm

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

data class CountdownPrayer(
  val name: String,
  val date: String,
  val time: String,
  val timestamp: Long,
  val previousTimestamp: Long?,
  val phase: String = "start",
)

data class CountdownPlan(
  val enabled: Boolean,
  val location: String,
  val timeFormat: String,
  val events: List<CountdownPrayer>,
  val kerahat: List<CountdownKerahat> = emptyList(),
)

/** A separate durable timetable, so turning off an advance reminder never changes the timer. */
object CountdownState {
  const val CHANNEL = "nurvaxt-countdown-v2"
  const val NOTIFICATION_ID = 7401
  fun prefs(context: Context) = context.getSharedPreferences("nurvaxt-countdown", Context.MODE_PRIVATE)

  private fun decode(json: JSONObject): CountdownPlan {
    val events = json.getJSONArray("events")
    return CountdownPlan(
      json.getBoolean("enabled"), json.getString("location"), json.getString("timeFormat"),
      (0 until events.length()).map {
        val event = events.getJSONObject(it)
        CountdownPrayer(
          event.getString("name"), event.getString("date"), event.getString("time"),
          event.getLong("timestamp"),
          if (event.isNull("previousTimestamp")) null else event.getLong("previousTimestamp"),
          event.optString("phase", "start"),
        )
      }.sortedBy { it.timestamp },
      json.optJSONArray("kerahat")?.let { values ->
        (0 until values.length()).map { index ->
          val event = values.getJSONObject(index)
          CountdownKerahat(event.getString("name"), event.getString("date"), event.getLong("start"), event.getLong("end"), event.getLong("warningStart"))
        }.sortedBy { it.start }
      } ?: emptyList(),
    )
  }

  fun read(context: Context): CountdownPlan? =
    prefs(context).getString("plan", null)?.let { decode(JSONObject(it)) }

  @Synchronized fun replace(context: Context, json: JSONObject) {
    val plan = decode(json)
    require(plan.timeFormat in listOf("12", "24"))
    require(plan.events.all { it.timestamp > 0 && it.name.isNotBlank() && it.phase in listOf("start", "end") })
    require(plan.kerahat.all { it.name.isNotBlank() && it.start > 0 && it.end > it.start && it.warningStart <= it.start && it.start - it.warningStart <= 7_200_000 })
    check(prefs(context).edit().putString("plan", json.toString()).commit())
    sync(context)
  }

  fun next(plan: CountdownPlan, now: Long): CountdownPrayer? {
    val zone = TimeZone.getTimeZone("Asia/Baku")
    val calendar = Calendar.getInstance(zone).apply { timeInMillis = now }
    val format = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { timeZone = zone }
    val today = format.format(calendar.time)
    calendar.add(Calendar.DATE, 1)
    val tomorrow = format.format(calendar.time)
    return plan.events.firstOrNull {
      it.timestamp > now && (it.date == today || it.date == tomorrow)
    }
  }

  fun allowed(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(
        context, Manifest.permission.POST_NOTIFICATIONS,
      ) != PackageManager.PERMISSION_GRANTED) return false
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    return Build.VERSION.SDK_INT < 26 ||
      manager.getNotificationChannel(CHANNEL)?.importance != NotificationManager.IMPORTANCE_NONE
  }

  private fun boundaryIntent(context: Context) = PendingIntent.getBroadcast(
    context, 0, Intent(context, CountdownReceiver::class.java),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  fun cancelBoundary(context: Context) {
    val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarm.cancel(boundaryIntent(context))
  }

  fun armBoundary(context: Context, plan: CountdownPlan, prayer: CountdownPrayer, now: Long) {
    // Only the next visual threshold wakes the device; the per-second timer is system-rendered.
    val prayerBoundary = listOf(prayer.timestamp - 1_800_000, prayer.timestamp - 900_000, prayer.timestamp)
      .firstOrNull { it > now }
    val timestamp = listOfNotNull(prayerBoundary, CountdownSolar.boundary(plan.kerahat, now))
      .minOrNull() ?: return
    val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    if (AlarmQueue.exact(context))
      alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, boundaryIntent(context))
    else alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, boundaryIntent(context))
  }

  fun sync(context: Context) {
    try {
      val plan = read(context)
      val now = System.currentTimeMillis()
      val next = plan?.takeIf { it.enabled && allowed(context) }?.let { next(it, now) }
      if (next == null) {
        cancelBoundary(context)
        context.stopService(Intent(context, CountdownService::class.java))
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
        prefs(context).edit().putBoolean("active", false).remove("lastError").apply()
      } else {
        armBoundary(context, plan!!, next, now)
        ContextCompat.startForegroundService(context, Intent(context, CountdownService::class.java))
      }
    } catch (error: Exception) {
      // Countdown start restrictions must never prevent the independent prayer alarm plan.
      Log.e("NurvaxtCountdown", "Countdown service could not be started", error)
      prefs(context).edit().putString("lastError", error.message ?: error.javaClass.simpleName).apply()
    }
  }
}

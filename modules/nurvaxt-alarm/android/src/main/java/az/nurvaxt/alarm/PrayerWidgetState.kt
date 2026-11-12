package az.nurvaxt.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import org.json.JSONObject

object PrayerWidgetState {
  private fun prefs(context: Context) = context.getSharedPreferences("nurvaxt-widgets", Context.MODE_PRIVATE)
  private val providers = mapOf(
    "large" to LargePrayerWidget::class.java,
    "compact" to CompactPrayerWidget::class.java,
    "small" to SmallPrayerWidget::class.java,
  )

  private fun decode(json: JSONObject): WidgetPlan {
    require(json.getInt("version") == 1)
    val format = json.getString("timeFormat")
    val location = json.getString("location")
    require(format in listOf("12", "24") && location.isNotBlank())
    val days = json.getJSONArray("days")
    require(days.length() <= 1500)
    val decoded = (0 until days.length()).map { index ->
      val day = days.getJSONObject(index)
      val date = day.getString("date")
      require(Regex("\\d{4}-\\d{2}-\\d{2}").matches(date))
      val prayers = day.getJSONArray("prayers")
      require(prayers.length() <= 5)
      val entries = (0 until prayers.length()).map { position ->
        val prayer = prayers.getJSONObject(position)
        val field = prayer.getString("field")
        val name = prayer.getString("name")
        val time = prayer.getString("time")
        val timestamp = prayer.getLong("timestamp")
        require(field in PrayerWidgetModel.fields && name.isNotBlank())
        require(Regex("([01]\\d|2[0-3]):[0-5]\\d").matches(time))
        require(timestamp == PrayerWidgetModel.timestamp(date, time))
        WidgetPrayer(field, name, time, timestamp)
      }
      require(entries.map { it.field }.distinct().size == entries.size)
      WidgetDay(date, entries.sortedBy { it.timestamp })
    }
    require(decoded.map { it.date }.distinct().size == decoded.size)
    return WidgetPlan(location, format, decoded.sortedBy { it.date })
  }

  fun read(context: Context): WidgetPlan? = try {
    prefs(context).getString("plan", null)?.let { decode(JSONObject(it)) }
  } catch (error: Exception) {
    Log.w("NurvaxtWidget", "Widget calendar is unavailable", error)
    null
  }

  @Synchronized fun replace(context: Context, json: JSONObject) {
    decode(json)
    check(prefs(context).edit().putString("plan", json.toString()).commit())
    update(context)
  }

  private fun refreshIntent(context: Context) = PendingIntent.getBroadcast(
    context, 7410, Intent(context, PrayerWidgetRefreshReceiver::class.java),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  @Synchronized fun update(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val active = providers.mapValues { (_, provider) ->
      manager.getAppWidgetIds(ComponentName(context, provider))
    }
    val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    if (active.values.all { it.isEmpty() }) {
      alarm.cancel(refreshIntent(context))
      return
    }
    val plan = read(context)
    val now = System.currentTimeMillis()
    val snapshot = PrayerWidgetModel.snapshot(plan, now)
    for ((variant, ids) in active) for (id in ids) {
      try {
        manager.updateAppWidget(id, PrayerWidgetViews.build(context, variant, plan, snapshot, now, manager.getAppWidgetOptions(id)))
      } catch (error: Exception) {
        Log.e("NurvaxtWidget", "Widget $id could not be updated", error)
      }
    }
    val next = PrayerWidgetModel.nextUpdate(snapshot, now)
    // RTC deliberately does not wake the device. A due refresh is delivered when it wakes.
    // No foreground service, notification permission or new exact-alarm prompt is needed.
    try {
      if (Build.VERSION.SDK_INT < 31 || alarm.canScheduleExactAlarms()) {
        alarm.setExact(AlarmManager.RTC, next, refreshIntent(context))
      } else alarm.set(AlarmManager.RTC, next, refreshIntent(context))
    } catch (_: SecurityException) {
      // Exact access can be revoked between checking and scheduling.
      alarm.set(AlarmManager.RTC, next, refreshIntent(context))
    }
  }

  fun pin(context: Context, variant: String): Boolean {
    val provider = providers[variant] ?: return false
    if (Build.VERSION.SDK_INT < 26) return false
    val manager = AppWidgetManager.getInstance(context)
    if (!manager.isRequestPinAppWidgetSupported) return false
    val now = System.currentTimeMillis()
    val plan = read(context)
    val preview = PrayerWidgetViews.build(context, variant, plan, PrayerWidgetModel.snapshot(plan, now), now)
    return manager.requestPinAppWidget(ComponentName(context, provider), Bundle().apply {
      putParcelable(AppWidgetManager.EXTRA_APPWIDGET_PREVIEW, preview)
    }, null)
  }
}

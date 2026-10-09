package az.nurvaxt.alarm

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/** Durable future plan; only the next 32 timestamps are registered with AlarmManager. */
object AlarmQueue {
  private fun prefs(context: Context) = context.getSharedPreferences("nurvaxt-alarm", Context.MODE_PRIVATE)
  private fun manager(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  fun exact(context: Context) = Build.VERSION.SDK_INT < 31 || manager(context).canScheduleExactAlarms()
  private fun intent(context: Context, timestamp: Long) = Intent(context, AlarmReceiver::class.java).setData(Uri.parse("nurvaxt://alarm/$timestamp")).putExtra("timestamp", timestamp)
  private fun pending(context: Context, timestamp: Long) = PendingIntent.getBroadcast(context, 0, intent(context, timestamp), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  private fun cancel(context: Context) {
    val registered = JSONArray(prefs(context).getString("registered", "[]"))
    for (i in 0 until registered.length()) { val operation = pending(context, registered.getLong(i)); manager(context).cancel(operation); operation.cancel() }
  }
  @Synchronized fun replace(context: Context, events: JSONArray) {
    // Validate before touching the previous durable plan.
    val ids = mutableSetOf<String>()
    for (i in 0 until events.length()) {
      val event = events.getJSONObject(i)
      require(event.getString("id").startsWith("nurvaxt:") && ids.add(event.getString("id")))
      require(event.getLong("timestamp") > 0)
      require(event.getString("sound") in listOf("silent", "default", "tone"))
    }
    cancel(context)
    check(prefs(context).edit().putString("plan", events.toString()).putString("registered", "[]").commit())
    refill(context)
  }
  @Synchronized fun scheduleTest(context: Context) {
    val time = System.currentTimeMillis() + 5_000
    val plan = JSONArray(prefs(context).getString("plan", "[]"))
    plan.put(JSONObject().put("id", "nurvaxt:test:$time").put("timestamp", time)
      .put("body", "Sınaq bildirişi. Namaz xatırlatmaları üçün icazə aktivdir.")
      .put("sound", "default").put("vibration", true))
    replace(context, plan)
  }
  @Synchronized fun refill(context: Context) {
    val storage = prefs(context)
    try {
      cancel(context)
      val plan = JSONArray(storage.getString("plan", "[]"))
      val future = JSONArray()
      val timestamps = sortedSetOf<Long>()
      for (i in 0 until plan.length()) {
        val event = plan.getJSONObject(i)
        val time = event.getLong("timestamp")
        if (time > System.currentTimeMillis()) { future.put(event); timestamps.add(time) }
      }
      val registered = JSONArray()
      // Persist before registration, so boot restoration can recover from process death.
      storage.edit().putString("plan", future.toString()).putString("registered", "[]").commit()
      for (timestamp in timestamps.take(32)) {
        val operation = pending(context, timestamp)
        // Record intent identity before scheduling so partial failures remain cancellable.
        registered.put(timestamp)
        storage.edit().putString("registered", registered.toString()).commit()
        if (exact(context)) manager(context).setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, operation)
        else manager(context).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, operation)
      }
      storage.edit().putString("lastOperation", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", java.util.Locale.ROOT).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.format(java.util.Date())).remove("lastError").commit()
    } catch (error: Exception) {
      storage.edit().putString("lastError", error.message ?: error.javaClass.simpleName).commit()
      throw error
    }
  }
  @Synchronized fun deliver(context: Context, timestamp: Long) {
    val storage = prefs(context)
    val plan = JSONArray(storage.getString("plan", "[]"))
    val due = mutableListOf<JSONObject>()
    val rest = JSONArray()
    if (timestamp <= 0) return
    val now = System.currentTimeMillis()
    for (i in 0 until plan.length()) {
      val event = plan.getJSONObject(i)
      val eventTime = event.getLong("timestamp")
      if (eventTime <= now) { if (now - eventTime <= 600_000) due.add(event) } else rest.put(event)
    }
    // Never emit a stale prayer reminder delayed by more than ten minutes.
    // Consume before presentation to avoid duplicate delivery from simultaneous broadcasts.
    storage.edit().putString("plan", rest.toString()).commit()
    if (due.isNotEmpty() && (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)) {
      val event = due.first()
      val sound = event.getString("sound"); val vibrate = event.getBoolean("vibration")
      val channelId = "nurvaxt-$sound-$vibrate-v1"
      val notifications = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= 26) {
        val channel = NotificationChannel(channelId, "Namaz xatırlatmaları", NotificationManager.IMPORTANCE_HIGH)
        channel.enableVibration(vibrate)
        val uri = when(sound) { "silent" -> null; "tone" -> Uri.parse("android.resource://${context.packageName}/raw/nurvaxt_tone"); else -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION) }
        channel.setSound(uri, AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build())
        notifications.createNotificationChannel(channel)
      }
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      val tap = launch?.let { PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
      val body = due.joinToString("\n") { it.getString("body") }
      val notification = NotificationCompat.Builder(context, channelId)
        .setSmallIcon(context.resources.getIdentifier("notification_icon", "drawable", context.packageName).takeIf { it != 0 } ?: context.applicationInfo.icon).setContentTitle("NurVaxt").setContentText(body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body)).setAutoCancel(true)
        .setContentIntent(tap).setPriority(NotificationCompat.PRIORITY_HIGH)
      if (Build.VERSION.SDK_INT < 26) {
        if (sound != "silent") notification.setSound(if(sound == "tone") Uri.parse("android.resource://${context.packageName}/raw/nurvaxt_tone") else RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
        if (vibrate) notification.setVibrate(longArrayOf(0, 200))
      }
      notifications.notify(timestamp.toString().hashCode(), notification.build())
    }
    storage.edit().putString("plan", rest.toString()).commit()
    refill(context)
  }
  fun diagnostics(context: Context): Map<String, Any?> {
    val storage = prefs(context); val plan = JSONArray(storage.getString("plan", "[]"))
    val times = (0 until plan.length()).map { plan.getJSONObject(it).getLong("timestamp") }.filter { it > System.currentTimeMillis() }
    val countdown = CountdownState.prefs(context)
    return mapOf("exact" to exact(context), "count" to JSONArray(storage.getString("registered", "[]")).length(), "queued" to times.size, "next" to times.minOrNull(), "lastOperation" to storage.getString("lastOperation", null), "lastError" to storage.getString("lastError", null), "countdownActive" to countdown.getBoolean("active", false), "countdownError" to countdown.getString("lastError", null))
  }
}

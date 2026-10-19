package az.nurvaxt.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Build
import android.os.Bundle
import android.service.notification.StatusBarNotification
import android.util.Log
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** One dismissible reminder card, independent of the ongoing countdown. */
object ReminderNotification {
  const val NOTIFICATION_ID = 7404
  const val GROUP = "nurvaxt-reminders"
  internal const val EXTRA_ENTRIES = "az.nurvaxt.reminderEntries"
  private const val MAX_ENTRIES = 50

  private fun manager(context: Context) = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun legacy(record: StatusBarNotification) = record.notification.group == "nurvaxt" &&
    record.notification.flags and Notification.FLAG_AUTO_CANCEL != 0 &&
    record.notification.flags and Notification.FLAG_GROUP_SUMMARY == 0

  private fun entries(record: StatusBarNotification): List<JSONObject> {
    val saved = record.notification.extras.getString(EXTRA_ENTRIES)
    if (saved != null) {
      val decoded = runCatching {
        val array = JSONArray(saved)
        (0 until array.length()).map { array.getJSONObject(it).also { entry ->
          entry.getString("id"); entry.getLong("timestamp"); entry.getString("body")
        } }
      }.getOrNull()
      if (decoded != null) return decoded
    }
    val body = record.notification.extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: record.notification.extras.getCharSequence(Notification.EXTRA_TEXT) ?: return emptyList()
    return listOf(JSONObject().put("id", "legacy:${record.key}")
      .put("timestamp", record.postTime).put("body", body.toString()))
  }

  private fun history(active: Array<StatusBarNotification>, due: List<JSONObject>): List<JSONObject> =
    (due + active.filter { it.id == NOTIFICATION_ID || legacy(it) }.flatMap { entries(it) })
      .distinctBy { it.getString("id") }.sortedByDescending { it.getLong("timestamp") }.take(MAX_ENTRIES)

  @Synchronized fun post(context: Context, due: List<JSONObject>) {
    if (due.isEmpty()) return
    val notifications = manager(context)
    val active = notifications.activeNotifications
    val sound = due.first().getString("sound")
    val vibrate = due.first().getBoolean("vibration")
    val channelId = "nurvaxt-$sound-$vibrate-v1"
    if (Build.VERSION.SDK_INT >= 26) {
      notifications.createNotificationChannel(NotificationChannel(channelId, "Namaz xatırlatmaları", NotificationManager.IMPORTANCE_HIGH).apply {
        enableVibration(vibrate)
        setSound(ReminderSounds.uri(context, sound), AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build())
      })
    }
    val notification = build(context, channelId, history(active, due), true).apply {
      if (Build.VERSION.SDK_INT < 26) {
        this.sound = ReminderSounds.uri(context, sound)
        if (vibrate) this.vibrate = longArrayOf(0, 200)
      }
    }
    publish(context, notification, active)
  }

  /** Collapse reminders left by an older APK without playing their sound again. */
  @Synchronized fun migrate(context: Context) {
    val active = manager(context).activeNotifications
    val latest = active.filter { legacy(it) }.maxByOrNull { it.postTime } ?: return
    val channel = if (Build.VERSION.SDK_INT >= 26) latest.notification.channelId else "nurvaxt-default-true-v1"
    publish(context, build(context, channel, history(active, emptyList()), false), active)
  }

  private fun publish(context: Context, notification: Notification, active: Array<StatusBarNotification>) {
    val notifications = manager(context)
    // A silent summary owns only the reminder group. The countdown has its own group.
    notifications.notify(CountdownState.SUMMARY_ID, CountdownNotification.groupSummary(context))
    notifications.notify(NOTIFICATION_ID, notification)
    active.filter { legacy(it) }.forEach { notifications.cancel(it.tag, it.id) }
  }

  private fun build(context: Context, channelId: String, entries: List<JSONObject>, alert: Boolean): Notification {
    val latest = entries.first()
    val body = latest.getString("body")
    val time = SimpleDateFormat("HH:mm", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("Asia/Baku") }
    val expanded = if (entries.size == 1) body else entries.joinToString("\n") {
      "${time.format(Date(it.getLong("timestamp")))} · ${it.getString("body")}"
    }
    val saved = JSONArray()
    entries.forEach { saved.put(JSONObject().put("id", it.getString("id"))
      .put("timestamp", it.getLong("timestamp")).put("body", it.getString("body"))) }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val tap = launch?.let { PendingIntent.getActivity(context, NOTIFICATION_ID, it,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
    val builder = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(CountdownNotification.appIcon(context)).setContentTitle("NurVaxt").setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(expanded))
      .setWhen(latest.getLong("timestamp")).setAutoCancel(true).setOngoing(false)
      .setGroup(GROUP).setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
      // Reusing the ID must still alert for a new event; migration and the summary stay silent.
      .setOnlyAlertOnce(!alert).setSilent(!alert).setNumber(entries.size)
      .setDeleteIntent(PendingIntent.getBroadcast(context, NOTIFICATION_ID,
        Intent(context, ReminderDismissReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      .setContentIntent(tap).setPriority(NotificationCompat.PRIORITY_HIGH)
      .addExtras(Bundle().apply { putString(EXTRA_ENTRIES, saved.toString()) })
    if (entries.size > 1) builder.setSubText("${entries.size} xatırlatma")
    return messageNotification(context, builder, body, entries.size)
  }

  private fun messageNotification(context: Context, builder: NotificationCompat.Builder, body: String, count: Int): Notification {
    if (count != 1) return builder.build()
    fun content(lines: Int) = RemoteViews(context.packageName, R.layout.nurvaxt_reminder_message).apply {
      setTextViewText(R.id.reminder_title, "NurVaxt")
      setTextViewText(R.id.reminder_message, body)
      setInt(R.id.reminder_message, "setMaxLines", lines)
    }
    return try {
      val scale = context.resources.configuration.fontScale
      val compact = if (scale <= 1.1f) content(1) else null
      val expanded = content(Int.MAX_VALUE)
      val headsUp = content(if (scale >= 1.6f) 1 else 2)
      listOfNotNull(compact, expanded, headsUp).forEach { it.apply(context, null) }
      builder.setStyle(NotificationCompat.DecoratedCustomViewStyle())
        .setCustomContentView(compact).setCustomBigContentView(expanded)
        .setCustomHeadsUpContentView(headsUp).build()
    } catch (error: Exception) {
      Log.w("NurvaxtReminder", "Message layout unavailable; using system text", error)
      builder.setCustomContentView(null).setCustomBigContentView(null).setCustomHeadsUpContentView(null)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body)).build()
    }
  }
}

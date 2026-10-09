package az.nurvaxt.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.graphics.drawable.IconCompat

object CountdownNotification {
  private fun icon(remaining: Long): IconCompat {
    // Android fixes the status-bar slot size. Use its full area for one bold minute count,
    // rather than splitting hours/minutes into two tiny rows or shrinking digits into a frame.
    val bitmap = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)
      textSize = 128f
    }
    val text = ((remaining.coerceAtLeast(0) + 59_999) / 60_000).coerceAtLeast(1).toString()
    val bounds = Rect()
    paint.getTextBounds(text, 0, text.length, bounds)
    paint.textSize *= minOf(88f / bounds.width(), 88f / bounds.height())
    paint.getTextBounds(text, 0, text.length, bounds)
    canvas.drawText(text, 48f - bounds.exactCenterX(), 48f - bounds.exactCenterY(), paint)
    return IconCompat.createWithBitmap(bitmap)
  }

  private fun content(
    context: Context, layout: Int, title: String, stage: String, duration: String,
    remaining: Long, progress: Int?,
  ): RemoteViews = RemoteViews(context.packageName, layout).apply {
    setTextViewText(R.id.countdown_prayer, title)
    setTextViewText(R.id.countdown_stage, stage)
    setChronometerCountDown(R.id.countdown_timer, true)
    // The system renders seconds; the service continues to update only once per minute.
    setChronometer(R.id.countdown_timer, SystemClock.elapsedRealtime() + remaining, null, true)
    setContentDescription(R.id.countdown_timer, "$duration qalıb")
    if (layout == R.layout.nurvaxt_countdown_expanded) {
      val color = context.getColor(when {
        remaining <= 900_000 -> R.color.countdown_imminent
        remaining <= 1_800_000 -> R.color.countdown_soon
        else -> R.color.countdown_normal
      })
      setImageViewResource(R.id.countdown_symbol, when {
        remaining <= 900_000 -> R.drawable.nurvaxt_countdown_diamond
        remaining <= 1_800_000 -> R.drawable.nurvaxt_countdown_circle
        else -> R.drawable.nurvaxt_countdown_clock
      })
      setInt(R.id.countdown_symbol, "setColorFilter", color)
      setTextColor(R.id.countdown_timer, color)
      setViewVisibility(R.id.countdown_progress, if (progress == null) View.GONE else View.VISIBLE)
      setProgressBar(R.id.countdown_progress, 100, progress ?: 0, false)
    }
  }

  fun build(context: Context, plan: CountdownPlan, prayer: CountdownPrayer, now: Long): Notification {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      manager.createNotificationChannel(NotificationChannel(
        CountdownState.CHANNEL, "Namaza qalan vaxt", NotificationManager.IMPORTANCE_DEFAULT,
      ).apply {
        description = "Yuxarı sətirdə qalan dəqiqələr, paneldə iri canlı geri sayım."
        setSound(null, null)
        enableVibration(false)
        setShowBadge(false)
      })
    }
    val remaining = (prayer.timestamp - now).coerceAtLeast(0)
    val minutes = (remaining + 59_999) / 60_000
    val imminent = remaining <= 900_000
    val soon = remaining <= 1_800_000
    val time = if (plan.timeFormat == "12") {
      val hour = prayer.time.substringBefore(':').toInt()
      "${if (hour % 12 == 0) 12 else hour % 12}:${prayer.time.substringAfter(':')} ${if (hour < 12) "AM" else "PM"}"
    } else prayer.time
    val duration = if (minutes > 59) "${minutes / 60} saat ${minutes % 60} dəq." else "$minutes dəq."
    val stage = if (imminent) "Son 15 dəqiqə" else if (soon) "Son 30 dəqiqə" else "Namaza qalan vaxt"
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val tap = launch?.let {
      PendingIntent.getActivity(context, 7401, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val settings = PendingIntent.getActivity(
      context, 7402,
      Intent(Intent.ACTION_VIEW, Uri.parse("nurvaxt://settings")).setPackage(context.packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val body = "$duration qalıb · $stage"
    val title = "${prayer.name} · $time"
    val progress = prayer.previousTimestamp?.takeIf { it < prayer.timestamp }?.let {
      (((now - it).toDouble() / (prayer.timestamp - it)) * 100).toInt().coerceIn(0, 100)
    }
    val builder = NotificationCompat.Builder(context, CountdownState.CHANNEL)
      .setSmallIcon(icon(remaining))
      .setContentTitle(title)
      .setContentText(body)
      .setSubText(plan.location)
      .setStyle(NotificationCompat.DecoratedCustomViewStyle())
      .setCustomContentView(content(
        context, R.layout.nurvaxt_countdown_compact, title, stage, duration, remaining, progress,
      ))
      .setCustomBigContentView(content(
        context, R.layout.nurvaxt_countdown_expanded, title, stage, duration, remaining, progress,
      ))
      .setWhen(prayer.timestamp).setShowWhen(false)
      .setOngoing(true).setOnlyAlertOnce(true).setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .setContentIntent(tap)
      .setColor(Color.parseColor(if (imminent) "#C45A45" else if (soon) "#B4812E" else "#155E4B"))
      .addAction(0, "Ayarlar", settings)
    return builder.build()
  }
}

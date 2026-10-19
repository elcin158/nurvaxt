package az.nurvaxt.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.graphics.drawable.IconCompat
import kotlin.math.roundToInt

object CountdownNotification {
  private const val ICON = 96
  /** The stacked variant's mark row; the rest of the slot carries the count below it. */
  private const val STACKED_MARK = 44

  /** Numeric countdowns appear only in the final hour. */
  private const val HOUR = 3_600_000L

  /** Ceil-rounded seconds and whole minutes left — the units both the icon and the text report. */
  private fun units(remaining: Long): Pair<Long, Long> {
    val seconds = (remaining.coerceAtLeast(0) + 999) / 1000
    return seconds to (seconds + 59) / 60
  }

  private fun remainingDescription(remaining: Long): String {
    val (seconds, minutes) = units(remaining)
    return when {
      minutes >= 60 -> "${minutes / 60} saat ${minutes % 60} dəq."
      seconds >= 60 -> "$minutes dəq."
      else -> "${seconds.coerceAtLeast(1)} san."
    }
  }

  private fun mark(context: Context): Bitmap =
    requireNotNull(BitmapFactory.decodeResource(context.resources, R.drawable.nurvaxt_countdown_app_mark))

  /**
   * The opaque box inside the source mark. generate-assets.ts pads it with a transparent border,
   * and fitting a wider-than-tall mark into a square leaves more padding above and below. Android
   * scales the bitmap as a whole into the status-bar slot, so that padding is slot area the
   * artwork never gets to use.
   */
  private fun artwork(mark: Bitmap): Rect {
    val pixels = IntArray(mark.width * mark.height)
    mark.getPixels(pixels, 0, mark.width, 0, 0, mark.width, mark.height)
    var left = mark.width
    var top = mark.height
    var right = -1
    var bottom = -1
    for (y in 0 until mark.height) for (x in 0 until mark.width) {
      if (pixels[y * mark.width + x] ushr 24 == 0) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
    if (right < 0) return Rect(0, 0, mark.width, mark.height)
    return Rect(left, top, right + 1, bottom + 1)
  }

  /** The largest centred rect inside [box] that keeps [artwork]'s aspect ratio. */
  private fun fill(artwork: Rect, box: Rect): Rect {
    val scale = minOf(
      box.width().toFloat() / artwork.width(),
      box.height().toFloat() / artwork.height(),
    )
    val width = (artwork.width() * scale).roundToInt()
    val height = (artwork.height() * scale).roundToInt()
    val left = box.left + (box.width() - width) / 2
    val top = box.top + (box.height() - height) / 2
    return Rect(left, top, left + width, top + height)
  }

  internal fun appIcon(context: Context): IconCompat {
    val mark = mark(context)
    val bitmap = Bitmap.createBitmap(ICON, ICON, Bitmap.Config.ARGB_8888)
    // The artwork touches the bitmap's edges, which is as large as the fixed system slot can draw
    // it without distorting the mark: its height is then bounded by its own aspect ratio.
    val source = artwork(mark)
    Canvas(bitmap).drawBitmap(mark, source, fill(source, Rect(0, 0, ICON, ICON)),
      Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
    return IconCompat.createWithBitmap(bitmap)
  }

  private fun icon(context: Context, remaining: Long): IconCompat {
    // Send artwork bytes rather than a resource ID that SystemUI could resolve against an old APK.
    if (remaining >= HOUR) return appIcon(context)
    val bitmap = Bitmap.createBitmap(ICON, ICON, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val mark = mark(context)
    // The mark fills its row too, keeping only the gap the count below it needs.
    val source = artwork(mark)
    canvas.drawBitmap(mark, source, fill(source, Rect(0, 0, ICON, STACKED_MARK)),
      Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
    val (seconds, minutes) = units(remaining)
    val text = if (remaining >= 60_000) minutes.toString() else seconds.coerceAtLeast(1).toString()
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      typeface = Typeface.create("sans-serif", Typeface.NORMAL)
      textSize = 128f
    }
    val bounds = Rect()
    paint.getTextBounds(text, 0, text.length, bounds)
    val height = minOf(
      40f,
      (ICON - 8f) * bounds.height() / bounds.width(),
    )
    paint.textSize *= height / bounds.height()
    paint.getTextBounds(text, 0, text.length, bounds)
    canvas.drawText(text, ICON / 2f - bounds.exactCenterX(), ICON * 3 / 4f - bounds.exactCenterY(), paint)
    return IconCompat.createWithBitmap(bitmap)
  }

  private fun content(
    context: Context, layout: Int, prayer: CountdownPrayer, stage: String, duration: String,
    remaining: Long, progress: Int?, plan: CountdownPlan, now: Long,
  ): RemoteViews = RemoteViews(context.packageName, layout).apply {
    val expanded = layout == R.layout.nurvaxt_countdown_expanded
    val time = displayTime(prayer, plan.timeFormat)
    setTextViewText(R.id.countdown_prayer, if (expanded) prayer.name else "${prayer.name} · $time")
    setTextViewText(R.id.countdown_stage, stage)
    setChronometerCountDown(R.id.countdown_timer, true)
    // The system renders seconds; the service continues to update only once per minute.
    setChronometer(R.id.countdown_timer, SystemClock.elapsedRealtime() + remaining, null, true)
    val target = when {
      prayer.phase == "end" -> "Sübhün bitməsinə"
      prayer.name == "İmsak" -> "İmsak vaxtına"
      else -> "${prayer.name} namazına"
    }
    setContentDescription(R.id.countdown_timer, "$target $duration qalıb")
    if (expanded) {
      setTextViewText(R.id.countdown_time, time)
      setTextViewText(R.id.countdown_stage, when {
        prayer.phase == "end" -> "Sübhün bitməsinə qalan vaxt"
        remaining <= 900_000 -> "Son 15 dəqiqə"
        remaining <= 1_800_000 -> "Son 30 dəqiqə"
        else -> ""
      })
      val color = context.getColor(when {
        remaining <= 900_000 -> R.color.countdown_imminent
        remaining <= 1_800_000 -> R.color.countdown_soon
        else -> R.color.countdown_normal
      })
      setViewVisibility(R.id.countdown_symbol, if (remaining <= 1_800_000) View.VISIBLE else View.GONE)
      setImageViewResource(R.id.countdown_symbol,
        if (remaining <= 900_000) R.drawable.nurvaxt_countdown_diamond else R.drawable.nurvaxt_countdown_circle)
      setInt(R.id.countdown_symbol, "setColorFilter", color)
      setTextColor(R.id.countdown_timer, color)
      setTextColor(R.id.countdown_stage, color)
      if (Build.VERSION.SDK_INT >= 31) {
        setColorStateList(R.id.countdown_progress, "setProgressTintList", ColorStateList.valueOf(color))
      }
      setViewVisibility(R.id.countdown_progress, if (progress == null) View.GONE else View.VISIBLE)
      setProgressBar(R.id.countdown_progress, 100, progress ?: 0, false)
      val kerahat = CountdownSolar.kerahat(plan.kerahat, now)
      setViewVisibility(R.id.countdown_kerahat, if (kerahat == null) View.GONE else View.VISIBLE)
      if (kerahat != null) {
        setTextViewText(R.id.countdown_kerahat_label, "Kərahət · ${kerahat.name}")
        setTextViewText(R.id.countdown_kerahat_stage, "Bitməsinə qalan vaxt")
        setChronometerCountDown(R.id.countdown_kerahat_timer, true)
        setChronometer(R.id.countdown_kerahat_timer, SystemClock.elapsedRealtime() + kerahat.end - now, null, true)
        setContentDescription(R.id.countdown_kerahat_timer, "${kerahat.name} kərahətinin bitməsinə ${remainingDescription(kerahat.end - now)} qalıb, təxmini interval.")
      }
    }
  }

  private fun clock(time: String, format: String): String {
    if (format != "12") return time
    val hour = time.substringBefore(':').toInt()
    return "${if (hour % 12 == 0) 12 else hour % 12}:${time.substringAfter(':')} ${if (hour < 12) "AM" else "PM"}"
  }

  private fun displayTime(prayer: CountdownPrayer, format: String): String =
    (if (prayer.phase == "end") "Günçıxma · " else "") + clock(prayer.time, format)

  private fun createChannel(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      manager.createNotificationChannel(NotificationChannel(
        CountdownState.CHANNEL, "Namaza qalan vaxt", NotificationManager.IMPORTANCE_DEFAULT,
      ).apply {
        description = "Yuxarı sətirdə hilalsız tətbiq ikonu və son 60 dəqiqədə altında qalan vaxt, paneldə iri canlı geri sayım."
        setSound(null, null)
        enableVibration(false)
        setShowBadge(false)
      })
    }
  }

  /** Silent owner of the reminder group; the ongoing countdown remains a separate card. */
  fun groupSummary(context: Context): Notification {
    createChannel(context)
    return NotificationCompat.Builder(context, CountdownState.CHANNEL)
      .setSmallIcon(appIcon(context))
      .setContentTitle("NurVaxt")
      .setGroup(ReminderNotification.GROUP).setGroupSummary(true)
      .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
      .setOnlyAlertOnce(true).setSilent(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .build()
  }

  /** The summary only exists to own reminders; drop it once the panel holds none. */
  fun pruneGroupSummary(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val active = runCatching { manager.activeNotifications }.getOrNull() ?: return
    val reminders = active.any { it.id == ReminderNotification.NOTIFICATION_ID }
    if (!reminders) manager.cancel(CountdownState.SUMMARY_ID)
  }

  /** A fast foreground notification with a small local app bitmap, no plan parsing or custom layouts. */
  fun startup(context: Context): Notification {
    createChannel(context)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CountdownState.CHANNEL)
      else Notification.Builder(context)
    builder
      // No app resource IDs: acknowledge a fresh install/start even if SystemUI cached old resources.
      .setSmallIcon(appIcon(context).toIcon(context))
      .setContentTitle("Namaza qalan vaxt")
      .setContentText("Vaxt göstəricisi hazırlanır…")
      .setShowWhen(false).setOngoing(true).setOnlyAlertOnce(true).setSound(null).setVibrate(null)
      .setAutoCancel(false).setDeleteIntent(CountdownDismissReceiver.restoreIntent(context))
      .setGroup(CountdownState.GROUP)
      .setCategory(Notification.CATEGORY_SERVICE)
      .setPriority(Notification.PRIORITY_DEFAULT)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
    if (Build.VERSION.SDK_INT >= 31) builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    return builder.build()
  }

  fun build(context: Context, plan: CountdownPlan, prayer: CountdownPrayer, now: Long): Notification {
    createChannel(context)
    val remaining = (prayer.timestamp - now).coerceAtLeast(0)
    val imminent = remaining <= 900_000
    val soon = remaining <= 1_800_000
    val time = displayTime(prayer, plan.timeFormat)
    val duration = remainingDescription(remaining)
    val stage = when {
      prayer.phase == "end" -> "Sübhün bitməsinə qalan vaxt"
      imminent -> "Son 15 dəqiqə"
      soon -> "Son 30 dəqiqə"
      prayer.name == "İmsak" -> "İmsaka qalan vaxt"
      else -> "Namaza qalan vaxt"
    }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val tap = launch?.let {
      PendingIntent.getActivity(context, 7401, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val kerahat = CountdownSolar.kerahat(plan.kerahat, now)
    val solarSummary = kerahat?.let { "Kərahət vaxtıdır · ${it.name}" }.orEmpty()
    val body = "$duration · $stage" + if (solarSummary.isEmpty()) "" else " · $solarSummary"
    val title = "${prayer.name} · $time"
    val progress = prayer.previousTimestamp?.takeIf { it < prayer.timestamp }?.let {
      (((now - it).toDouble() / (prayer.timestamp - it)) * 100).toInt().coerceIn(0, 100)
    }
    val builder = NotificationCompat.Builder(context, CountdownState.CHANNEL)
      .setSmallIcon(icon(context, remaining))
      .setContentTitle(title)
      .setContentText(body)
      .setSubText(plan.location)
      .setWhen(prayer.timestamp).setShowWhen(false)
      .setOngoing(true).setOnlyAlertOnce(true).setSilent(true)
      .setAutoCancel(false).setDeleteIntent(CountdownDismissReceiver.restoreIntent(context))
      .setGroup(CountdownState.GROUP)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .setContentIntent(tap)
      .setColor(Color.parseColor(if (imminent) "#C45A45" else if (soon) "#B4812E" else "#2D5CE3"))
    if (prayer.phase == "start" && Build.VERSION.SDK_INT >= 36 && CountdownLiveUpdate.eligible(
        Build.VERSION.SDK_INT_FULL, LiveNotificationAccess.allowed(context), remaining, prayer.timestamp,
        CountdownState.prefs(context).getLong(CountdownLiveUpdate.DISMISSED_PRAYER, 0),
      )) {
      val live = CountdownLiveUpdate.notification(
        context, builder.build(), prayer.timestamp, prayer.previousTimestamp, remaining,
      )
      if (live.hasPromotableCharacteristics()) return live
    }
    return customOrStandard(context, builder) {
      content(context, R.layout.nurvaxt_countdown_compact, prayer,
        if (prayer.phase == "end") stage else solarSummary.ifEmpty { stage }, duration, remaining, progress, plan, now) to
        content(context, R.layout.nurvaxt_countdown_expanded, prayer,
          stage, duration, remaining, progress, plan, now)
    }
  }

  /** SystemUI reports invalid RemoteViews asynchronously; a try/catch around notify cannot catch it. */
  internal fun customOrStandard(
    context: Context, builder: NotificationCompat.Builder, views: () -> Pair<RemoteViews, RemoteViews>,
  ): Notification {
    try {
      val (compact, expanded) = views()
      // Execute inflation and every RemoteViews action before submitting the foreground update.
      compact.apply(context, null)
      expanded.apply(context, null)
      val notification = builder.setStyle(NotificationCompat.DecoratedCustomViewStyle())
        .setCustomContentView(compact).setCustomBigContentView(expanded).build()
      CountdownState.prefs(context).edit().remove("notificationViewError").apply()
      return notification
    } catch (error: Exception) {
      Log.w("NurvaxtCountdown", "Custom countdown unavailable; using system countdown", error)
      CountdownState.prefs(context).edit()
        .putString("notificationViewError", error.message ?: error.javaClass.simpleName).apply()
      return builder.setCustomContentView(null).setCustomBigContentView(null)
        .setCustomHeadsUpContentView(null).setStyle(null)
        .setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true).build()
    }
  }
}

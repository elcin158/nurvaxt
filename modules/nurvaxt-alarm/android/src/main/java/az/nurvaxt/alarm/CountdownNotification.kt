package az.nurvaxt.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Build
import android.os.SystemClock
import android.text.SpannableString
import android.text.Spanned
import android.text.style.RelativeSizeSpan
import android.text.style.StyleSpan
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.graphics.drawable.IconCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
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

  private fun remainingMinutes(remaining: Long): String = units(remaining).second.coerceAtLeast(1).toString()

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
    context: Context, layout: Int, prayer: CountdownPrayer, duration: String,
    remaining: Long, plan: CountdownPlan, now: Long,
  ): RemoteViews = RemoteViews(context.packageName, layout).apply {
    val name = if (prayer.phase == "end") "Günçıxma" else prayer.name
    setTextViewText(R.id.countdown_prayer, inlineTime(name, clock(prayer.time, plan.timeFormat)))
    setImageViewBitmap(R.id.countdown_progress,
      progressTrack(context, CountdownTimeline.track(prayer, plan.kerahat, now)))
    setChronometerCountDown(R.id.countdown_timer, true)
    // Native Chronometer keeps seconds ticking even with the app closed; no JS/second polling.
    setChronometer(R.id.countdown_timer, SystemClock.elapsedRealtime() + remaining, null, true)
    val target = when {
      prayer.phase == "end" -> "Sübhün bitməsinə"
      prayer.name == "İmsak" -> "İmsak vaxtına"
      else -> "${prayer.name} namazına"
    }
    setContentDescription(R.id.countdown_timer, "$target $duration qalıb")
    setContentDescription(R.id.countdown_prayer, "$name, vaxtı ${displayTime(prayer, plan.timeFormat)}")
    // Compact content conveys kərahət only through the shared timeline.
    if (layout != R.layout.nurvaxt_countdown_expanded) return@apply
    val kerahat = CountdownSolar.countdown(plan.kerahat, now, prayer.timestamp)
    setViewVisibility(R.id.countdown_kerahat, if (kerahat == null) View.GONE else View.VISIBLE)
    if (kerahat != null) {
      val color = context.getColor(R.color.countdown_kerahat)
      val label = if (kerahat.active) "Kərahət bitməsinə" else "Kərahət girməsinə"
      setTextViewText(R.id.countdown_kerahat_label,
        inlineTime(label, timestampTime(kerahat.target, plan.timeFormat)))
      setTextColor(R.id.countdown_kerahat_label, color)
      setTextColor(R.id.countdown_kerahat_timer, color)
      setTextViewText(R.id.countdown_kerahat_timer, remainingMinutes(kerahat.target - now))
      val startDescription = "başlanğıcı ${timestampTime(kerahat.event.start, plan.timeFormat)}, "
      val phase = if (kerahat.active) "bitməsinə" else "girməsinə"
      val description = "${kerahat.event.name} kərahəti, ${startDescription}$phase ${remainingMinutes(kerahat.target - now)} dəqiqə qalıb, təxmini interval."
      setContentDescription(R.id.countdown_kerahat_label, description)
      setContentDescription(R.id.countdown_kerahat_timer, description)
    }
  }

  /** Only the secondary scheduled time is smaller; the live timer stays in its own column. */
  private fun inlineTime(name: String, time: String): CharSequence {
    return SpannableString("$name · $time").apply {
      setSpan(RelativeSizeSpan(0.8f), name.length, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      setSpan(StyleSpan(Typeface.NORMAL), name.length, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
  }

  /** Small RemoteViews-compatible artwork with room for the current-position marker. */
  internal fun progressTrack(context: Context, track: CountdownTrack): Bitmap {
    val density = context.resources.displayMetrics.density
    val width = (360 * density).roundToInt().coerceIn(1, 1440)
    val height = (12 * density).roundToInt().coerceAtLeast(1)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val centerY = height / 2f
    val radius = 2 * density
    val bounds = RectF(0f, centerY - radius, width.toFloat(), centerY + radius)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = context.getColor(R.color.countdown_progress_track)
    }
    canvas.drawRoundRect(bounds, radius, radius, paint)
    canvas.save()
    canvas.clipPath(Path().apply { addRoundRect(bounds, radius, radius, Path.Direction.CW) })
    val progress = track.progress
    if (progress != null && progress > 0f) {
      val right = width * progress.coerceIn(0f, 1f)
      paint.shader = LinearGradient(0f, 0f, right, 0f,
        context.getColor(R.color.countdown_progress_start), context.getColor(R.color.countdown_progress_end),
        Shader.TileMode.CLAMP)
      canvas.drawRoundRect(RectF(0f, bounds.top, right, bounds.bottom), radius, radius, paint)
      paint.shader = null
    }
    paint.color = context.getColor(R.color.countdown_kerahat_track)
    for (interval in track.kerahat) {
      canvas.drawRect(width * interval.start, bounds.top, width * interval.end, bounds.bottom, paint)
    }
    canvas.restore()
    if (progress != null) {
      // One solid dot, without rings or glow, marks the same position on every interval.
      val markerRadius = 3.5f * density
      val center = (width * progress.coerceIn(0f, 1f)).coerceIn(markerRadius, width - markerRadius)
      paint.color = context.getColor(R.color.countdown_progress_indicator)
      canvas.drawCircle(center, centerY, markerRadius, paint)
    }
    return bitmap
  }

  private fun clock(time: String, format: String): String {
    if (format != "12") return time
    val hour = time.substringBefore(':').toInt()
    return "${if (hour % 12 == 0) 12 else hour % 12}:${time.substringAfter(':')} ${if (hour < 12) "AM" else "PM"}"
  }

  private fun displayTime(prayer: CountdownPrayer, format: String): String =
    (if (prayer.phase == "end") "Günçıxma · " else "") + clock(prayer.time, format)

  private fun timestampTime(timestamp: Long, format: String): String = clock(
    SimpleDateFormat("HH:mm", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("Asia/Baku") }
      .format(Date(timestamp)), format,
  )

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

  /** One silent status-bar icon for both cards, retaining the countdown's minute/second mark. */
  fun groupSummary(context: Context, countdown: Notification? = null): Notification {
    createChannel(context)
    return NotificationCompat.Builder(context, CountdownState.CHANNEL)
      .setSmallIcon(countdown?.smallIcon?.let { IconCompat.createFromIcon(context, it) } ?: appIcon(context))
      .setContentTitle("NurVaxt")
      .setGroup(CountdownState.GROUP).setGroupSummary(true)
      .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
      .setOnlyAlertOnce(true).setSilent(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .build()
  }

  /** Keep an existing summary while the countdown remains: canceling it cancels its children. */
  fun syncGroupSummary(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val active = runCatching { manager.activeNotifications }.getOrNull() ?: return
    syncGroupSummary(context, active.firstOrNull { it.id == CountdownState.NOTIFICATION_ID }?.notification)
  }

  fun syncGroupSummary(context: Context, countdown: Notification?) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val active = runCatching { manager.activeNotifications }.getOrNull() ?: return
    val reminders = active.any { it.id == ReminderNotification.NOTIFICATION_ID }
    val groupedCountdown = countdown != null && active.any { it.id == CountdownState.SUMMARY_ID }
    if (reminders || groupedCountdown) {
      manager.notify(CountdownState.SUMMARY_ID, groupSummary(context, countdown))
    } else {
      manager.cancel(CountdownState.SUMMARY_ID)
    }
  }

  /** A fast foreground notification with a small local app bitmap, no plan parsing or custom layouts. */
  fun startup(context: Context): Notification {
    createChannel(context)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CountdownState.CHANNEL)
      else Notification.Builder(context)
    builder
      // No app resource IDs: acknowledge a fresh install/start even if SystemUI cached old resources.
      .setSmallIcon(appIcon(context).toIcon(context))
      .setContentTitle("NurVaxt")
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
      else -> ""
    }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val tap = launch?.let {
      PendingIntent.getActivity(context, 7401, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val kerahat = CountdownSolar.countdown(plan.kerahat, now, prayer.timestamp)
    val solarSummary = kerahat?.let {
      val phase = if (it.active) "bitməsinə" else "girməsinə"
      "${it.event.name} kərahətinin $phase ${remainingMinutes(it.target - now)} dəqiqə"
    }.orEmpty()
    val body = listOf(duration, stage, solarSummary).filter { it.isNotEmpty() }.joinToString(" · ")
    val title = "${prayer.name} · $time"
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
      content(context, R.layout.nurvaxt_countdown_compact, prayer, duration, remaining, plan, now) to
        content(context, R.layout.nurvaxt_countdown_expanded, prayer, duration, remaining, plan, now)
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

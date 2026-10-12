package az.nurvaxt.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.graphics.drawable.IconCompat

object CountdownNotification {
  private const val ICON = 96

  /** Glyph height, as a share of the slot, that lands on the system clock's digit size. */
  private const val CLOCK = 0.7f

  /** Keep the combined icon to two digits; longer counts use the app mark alone. */
  private const val DIGITS = 99

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

  private fun icon(context: Context, remaining: Long): IconCompat {
    val (seconds, minutes) = units(remaining)
    val mark = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    val logo = if (mark != 0) BitmapFactory.decodeResource(context.resources, mark) else null
    // Send artwork bytes rather than a resource ID that SystemUI could resolve against an old APK.
    if (minutes > DIGITS && logo != null) return IconCompat.createWithBitmap(logo)
    val text = if (seconds >= 60) minutes.toString() else seconds.coerceAtLeast(1).toString()
    // Restore the app mark above the count within Android's square status-bar slot.
    val bitmap = Bitmap.createBitmap(ICON, ICON, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val logoBounds = logo?.let { alphaBounds(it) }?.takeUnless { it.isEmpty }
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      typeface = Typeface.create("sans-serif", Typeface.NORMAL)
      textSize = 128f
    }
    val bounds = Rect()
    paint.getTextBounds(text, 0, text.length, bounds)
    val logoRatio = logoBounds?.let { it.width().toFloat() / it.height() } ?: 0f
    val gap = if (logoBounds != null) 6f else 0f
    val height = minOf(
      if (logoBounds != null) (ICON - 12f) / 2f else CLOCK * ICON,
      (ICON - 4f) / maxOf(logoRatio, bounds.width().toFloat() / bounds.height()),
    )
    paint.textSize *= height / bounds.height()
    paint.getTextBounds(text, 0, text.length, bounds)
    val visibleHeight = bounds.height().toFloat()
    val logoWidth = visibleHeight * logoRatio
    val logoTop = (ICON - 2 * visibleHeight - gap) / 2f
    if (logo != null && logoBounds != null) {
      canvas.drawBitmap(logo, logoBounds, RectF(
        (ICON - logoWidth) / 2f, logoTop, (ICON + logoWidth) / 2f, logoTop + visibleHeight,
      ), Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
    }
    val numberCenter = if (logoBounds != null) logoTop + visibleHeight + gap + visibleHeight / 2f else ICON / 2f
    canvas.drawText(text, ICON / 2f - bounds.exactCenterX(), numberCenter - bounds.exactCenterY(), paint)
    return IconCompat.createWithBitmap(bitmap)
  }

  private fun alphaBounds(bitmap: Bitmap): Rect {
    val pixels = IntArray(bitmap.width * bitmap.height)
    bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
    return Rect().apply {
      pixels.forEachIndexed { index, pixel ->
        if (Color.alpha(pixel) >= 128) {
          val x = index % bitmap.width
          val y = index / bitmap.width
          union(x, y, x + 1, y + 1)
        }
      }
    }
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
    setContentDescription(R.id.countdown_timer, "${if (prayer.phase == "end") "Sübhün bitməsinə" else "${prayer.name} namazına"} $duration qalıb")
    if (expanded) {
      setTextViewText(R.id.countdown_time, time)
      setTextViewText(R.id.countdown_stage, when {
        prayer.phase == "end" -> "Sübhün bitməsinə qalan vaxt"
        remaining <= 900_000 -> "Son 15 dəqiqə"
        remaining <= 1_800_000 -> "Son 30 dəqiqə"
        else -> "qalıb"
      })
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
      setTextColor(R.id.countdown_stage, color)
      if (Build.VERSION.SDK_INT >= 31) {
        setColorStateList(R.id.countdown_progress, "setProgressTintList", ColorStateList.valueOf(color))
      }
      setViewVisibility(R.id.countdown_progress, if (progress == null) View.GONE else View.VISIBLE)
      setProgressBar(R.id.countdown_progress, 100, progress ?: 0, false)
      val kerahat = CountdownSolar.kerahat(plan.kerahat, now)
      setViewVisibility(R.id.countdown_kerahat, if (kerahat == null) View.GONE else View.VISIBLE)
      if (kerahat != null) {
        val active = now >= kerahat.start
        val until = if (active) kerahat.end else kerahat.start
        setTextViewText(R.id.countdown_kerahat_label, "Kərahət · ${kerahat.name}")
        setTextViewText(R.id.countdown_kerahat_stage, if (active) "Bitməsinə qalan vaxt" else "Başlamasına qalan vaxt")
        setChronometerCountDown(R.id.countdown_kerahat_timer, true)
        setChronometer(R.id.countdown_kerahat_timer, SystemClock.elapsedRealtime() + until - now, null, true)
        setContentDescription(R.id.countdown_kerahat_timer, "${kerahat.name} kərahətinin ${if (active) "bitməsinə" else "başlamasına"} ${remainingDescription(until - now)} qalıb, təxmini interval.")
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
        description = "Yuxarı sətirdə nişan və son 99 dəqiqənin sayı, paneldə iri canlı geri sayım."
        setSound(null, null)
        enableVibration(false)
        setShowBadge(false)
      })
    }
  }

  /** A fast, valid foreground notification: no plan parsing, artwork or Live Update preparation. */
  fun startup(context: Context): Notification {
    createChannel(context)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CountdownState.CHANNEL)
      else Notification.Builder(context)
    builder
      // No app resource IDs: acknowledge a fresh install/start even if SystemUI cached old resources.
      .setSmallIcon(Icon.createWithResource("android", android.R.drawable.ic_lock_idle_alarm))
      .setContentTitle("Namaza qalan vaxt")
      .setContentText("Vaxt göstəricisi hazırlanır…")
      .setShowWhen(false).setOngoing(true).setOnlyAlertOnce(true).setSound(null).setVibrate(null)
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
      else -> "Namaza qalan vaxt"
    }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val tap = launch?.let {
      PendingIntent.getActivity(context, 7401, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val settings = PendingIntent.getActivity(
      context, 7402,
      Intent(Intent.ACTION_VIEW, Uri.parse("nurvaxt://settings")).setPackage(context.packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val kerahat = CountdownSolar.kerahat(plan.kerahat, now)
    val solarSummary = kerahat
      ?.let { "${if (now >= it.start) "Kərahət vaxtıdır" else "Kərahət yaxınlaşır"} · ${it.name}" }
      .orEmpty()
    val body = "$duration qalıb · $stage" + if (solarSummary.isEmpty()) "" else " · $solarSummary"
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
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .setContentIntent(tap)
      .setColor(Color.parseColor(if (imminent) "#C45A45" else if (soon) "#B4812E" else "#2D5CE3"))
      .addAction(0, "Ayarlar", settings)
    if (prayer.phase == "start" && Build.VERSION.SDK_INT >= 36 && CountdownLiveUpdate.eligible(
        Build.VERSION.SDK_INT_FULL, LiveNotificationAccess.allowed(context), remaining, prayer.timestamp,
        CountdownState.prefs(context).getLong(CountdownLiveUpdate.DISMISSED_PRAYER, 0),
      )) {
      val live = CountdownLiveUpdate.notification(context, builder.build(), prayer.timestamp, remaining)
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

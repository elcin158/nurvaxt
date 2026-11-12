package az.nurvaxt.alarm

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.Layout
import android.text.TextPaint
import android.text.style.RelativeSizeSpan
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import kotlin.math.roundToInt

object PrayerWidgetViews {
  private val cells = listOf(
    Triple(R.id.widget_cell_fajr, R.id.widget_label_fajr, R.id.widget_value_fajr),
    Triple(R.id.widget_cell_dhuhr, R.id.widget_label_dhuhr, R.id.widget_value_dhuhr),
    Triple(R.id.widget_cell_asr, R.id.widget_label_asr, R.id.widget_value_asr),
    Triple(R.id.widget_cell_maghrib, R.id.widget_label_maghrib, R.id.widget_value_maghrib),
    Triple(R.id.widget_cell_isha, R.id.widget_label_isha, R.id.widget_value_isha),
  )

  fun build(
    context: Context, variant: String, plan: WidgetPlan?, snapshot: WidgetSnapshot, now: Long,
    options: Bundle = Bundle(),
  ): RemoteViews {
    val defaultWidth = if (variant == "small") 160 else 340
    val defaultHeight = when (variant) { "large" -> 240; "small" -> 168; else -> 76 }
    val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, defaultWidth)
    val maxWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, minWidth)
    val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, defaultHeight)
    val maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, minHeight)
    val portrait = sized(context, variant, plan, snapshot, now, minWidth, maxHeight)
    if (minWidth == maxWidth && minHeight == maxHeight) return portrait
    return RemoteViews(sized(context, variant, plan, snapshot, now, maxWidth, minHeight), portrait)
  }

  private fun sized(
    context: Context, variant: String, plan: WidgetPlan?, snapshot: WidgetSnapshot, now: Long,
    width: Int, height: Int,
  ): RemoteViews {
    val layout = when (variant) {
      "large" -> R.layout.nurvaxt_widget_large
      "compact" -> R.layout.nurvaxt_widget_compact
      else -> R.layout.nurvaxt_widget_small
    }
    val views = RemoteViews(context.packageName, layout)
    val format = plan?.timeFormat ?: "24"
    val prayer = snapshot.next
    val scale = minOf(width / (if (variant == "small") 160f else 340f), height / when (variant) {
      "large" -> 220f; "small" -> 168f; else -> 76f
    }).coerceIn(if (variant == "compact") 0.45f else 0.7f, 1.2f)
    val inset = if (variant == "compact" && height < 60) 12 else if (variant == "large") 18 else 14
    val padding = (inset * scale).roundToInt()
    val px = (padding * context.resources.displayMetrics.density).roundToInt()
    views.setViewPadding(R.id.widget_content, px, px, px, px)
    // Fit text to fixed launcher bounds, like auto-sizing, including large system fonts.
    fun size(id: Int, sp: Float) = views.setTextViewTextSize(id, TypedValue.COMPLEX_UNIT_PX,
      sp * scale * context.resources.displayMetrics.density)
    val contentWidth = (width - 2 * padding).coerceAtLeast(60).toFloat()
    val nameWidth = when (variant) { "large" -> contentWidth * 0.476f - 8; "compact" -> (contentWidth - 34) * 0.465f - 8; else -> contentWidth }
    val timerWidth = when (variant) { "large" -> contentWidth * 0.524f; "compact" -> (contentWidth - 34) * 0.535f; else -> contentWidth }
    fun fit(id: Int, value: CharSequence, sp: Float, widthDp: Float) {
      val metrics = context.resources.displayMetrics
      val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif", Typeface.BOLD)
        textSize = sp * scale * metrics.density
      }
      val desired = Layout.getDesiredWidth(value, paint)
      val fraction = if (desired > 0) (widthDp * metrics.density * 0.95f / desired).coerceAtMost(1f) else 1f
      size(id, sp * fraction)
    }
    size(R.id.widget_location, if (variant == "large") 13f else 11f)
    views.setTextViewText(R.id.widget_location, plan?.location ?: "Şəhər seçin")
    val name = prayer?.name ?: "Təqvim yoxdur"
    views.setTextViewText(R.id.widget_prayer, name)
    val time = prayer?.let { PrayerWidgetModel.time(it.time, format) } ?: "Tətbiqi açın"
    val timeLabel = if (snapshot.tomorrow) "Sabah · $time" else time
    val remaining = prayer?.let { duration(PrayerWidgetModel.remaining(it.timestamp - now)) } ?: "—"
    views.setTextViewText(R.id.widget_time, timeLabel)
    views.setTextViewText(R.id.widget_remaining, remaining)
    fit(R.id.widget_prayer, name, if (prayer == null) 18f else when (variant) { "large" -> 38f; "compact" -> 24f; else -> 29f }, nameWidth)
    fit(R.id.widget_time, timeLabel, if (variant == "compact") 16f else 23f, nameWidth)
    fit(R.id.widget_remaining, remaining, when (variant) { "large" -> 34f; "compact" -> 29f; else -> 20f }, timerWidth)
    if (variant != "compact") {
      views.setViewVisibility(R.id.widget_progress, if (snapshot.progress == null) View.INVISIBLE else View.VISIBLE)
      views.setImageViewBitmap(R.id.widget_progress, progress(snapshot.progress ?: 0f))
      views.setContentDescription(R.id.widget_progress, "Vaxtın irəliləyişi: ${((snapshot.progress ?: 0f) * 100).roundToInt()}%")
    }
    if (variant == "large") {
      size(R.id.widget_brand, 16f)
      size(R.id.widget_date, 11f)
      views.setTextViewText(R.id.widget_date, PrayerWidgetModel.displayDate(now))
      for ((index, ids) in cells.withIndex()) {
        val field = PrayerWidgetModel.fields[index]
        val entry = snapshot.day?.prayers?.find { it.field == field }
        val selected = prayer?.field == field && !snapshot.tomorrow
        val past = entry != null && entry.timestamp <= now
        val color = Color.parseColor(if (past) "#B5D3F5" else "#FFFFFF")
        views.setInt(ids.first, "setBackgroundResource", if (selected) R.drawable.nurvaxt_widget_selected else 0)
        views.setTextColor(ids.second, color)
        views.setTextColor(ids.third, color)
        views.setTextViewText(ids.third, entry?.let { PrayerWidgetModel.time(it.time, format) } ?: "—")
        size(ids.second, 10f)
        fit(ids.third, entry?.let { PrayerWidgetModel.time(it.time, format) } ?: "—", if (format == "12") 12f else 16f, contentWidth / 5 - 4)
      }
    }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    if (launch != null) views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(
      context, 7411, launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    ))
    views.setContentDescription(R.id.widget_root, listOfNotNull(
      "NurVaxt", plan?.location, PrayerWidgetModel.displayDate(now), prayer?.name,
      prayer?.let { time }, prayer?.let { "Geri sayım: ${PrayerWidgetModel.remaining(it.timestamp - now)}" },
      if (prayer == null) "Təqvim mövcud deyil. Tətbiqi açın." else null,
    ).joinToString(". "))
    return views
  }

  private fun duration(value: String): CharSequence = SpannableString(value).apply {
    Regex("dəq|s").findAll(value).forEach {
      setSpan(RelativeSizeSpan(0.55f), it.range.first, it.range.last + 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
  }

  private fun progress(fraction: Float): Bitmap {
    val bitmap = Bitmap.createBitmap(640, 16, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    paint.color = Color.parseColor("#507FC5FF")
    canvas.drawRoundRect(0f, 4f, 640f, 12f, 4f, 4f, paint)
    val end = 8f + fraction.coerceIn(0f, 1f) * 624f
    paint.color = Color.parseColor("#54E7FF")
    canvas.drawRoundRect(0f, 4f, end, 12f, 4f, 4f, paint)
    paint.color = Color.WHITE
    canvas.drawCircle(end, 8f, 7f, paint)
    return bitmap
  }
}

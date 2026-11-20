package az.nurvaxt.alarm

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.widget.RemoteViews

object PrayerWidgetViews {
  fun build(context: Context, variant: String, plan: WidgetPlan?, snapshot: WidgetSnapshot, now: Long, options: Bundle = Bundle()): RemoteViews {
    val design = PrayerWidgetArtwork.design(context, variant)
    val defaultWidth = when (variant) { "small", "list" -> 170; "vertical" -> 190; else -> 340 }
    val defaultHeight = (defaultWidth * design.getDouble("height") / design.getDouble("width")).toInt()
    val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, defaultWidth).coerceIn(40, 1200)
    val maxWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, minWidth).coerceIn(40, 1200)
    val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, defaultHeight).coerceIn(24, 1200)
    val maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, minHeight).coerceIn(24, 1200)
    val values = PrayerWidgetArtwork.values(plan, snapshot, now)
    fun sized(width: Int, height: Int): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.nurvaxt_widget_artwork)
      fun render(light: Boolean) = PrayerWidgetArtwork.render(
        context, variant, light, values, snapshot.next?.field?.takeUnless { snapshot.tomorrow },
        snapshot.progress, width, height,
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        // The launcher resolves the palette when it applies these RemoteViews.
        views.setIcon(
          R.id.widget_artwork, "setImageIcon",
          Icon.createWithBitmap(render(light = true)), Icon.createWithBitmap(render(light = false)),
        )
      } else {
        val nightMode = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        views.setImageViewBitmap(R.id.widget_artwork, render(light = nightMode != Configuration.UI_MODE_NIGHT_YES))
      }
      val description = listOf("NurVaxt", values["location"], values["date"], values["prayer"], values["time"],
        "Geri sayım: ${values["remaining"]}") + PrayerWidgetModel.fields.map { "${PrayerWidgetModel.labels[it]} ${values[it]}" }
      views.setContentDescription(android.R.id.background, description.joinToString(". "))
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) views.setOnClickPendingIntent(android.R.id.background, PendingIntent.getActivity(context, 7411,
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      return views
    }
    val portrait = sized(minWidth, maxHeight)
    return if (minWidth == maxWidth && minHeight == maxHeight) portrait else RemoteViews(sized(maxWidth, minHeight), portrait)
  }
}

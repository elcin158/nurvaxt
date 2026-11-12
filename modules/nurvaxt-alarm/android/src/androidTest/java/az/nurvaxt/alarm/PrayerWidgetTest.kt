package az.nurvaxt.alarm

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Bundle
import android.os.Parcel
import android.view.View
import android.view.ViewGroup
import android.widget.RemoteViews
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import java.io.File

/** Inflate the real launcher RemoteViews after parceling, including narrow and enlarged-font hosts. */
class PrayerWidgetTest {
  companion object { lateinit var context: Context }
  private val date = "2026-10-22"
  private val now = PrayerWidgetModel.timestamp(date, "15:30")
  private val day = WidgetDay(date, listOf(
    WidgetPrayer("fajr", "Sübh", "05:39", PrayerWidgetModel.timestamp(date, "05:39")),
    WidgetPrayer("dhuhr", "Zöhr", "12:25", PrayerWidgetModel.timestamp(date, "12:25")),
    WidgetPrayer("asr", "Əsr", "16:08", PrayerWidgetModel.timestamp(date, "16:08")),
    WidgetPrayer("maghrib", "Məğrib", "18:04", PrayerWidgetModel.timestamp(date, "18:04")),
    WidgetPrayer("isha", "İşa", "19:05", PrayerWidgetModel.timestamp(date, "19:05")),
  ))
  private val plan = WidgetPlan("Bakı", "24", listOf(day))

  private fun roundTrip(views: RemoteViews): RemoteViews {
    val parcel = Parcel.obtain()
    return try {
      views.writeToParcel(parcel, 0)
      parcel.setDataPosition(0)
      RemoteViews.CREATOR.createFromParcel(parcel)
    } finally { parcel.recycle() }
  }

  private fun inflate(
    variant: String, width: Int, height: Int, value: WidgetPlan? = plan, fontScale: Float = 1f,
  ): View {
    val config = Configuration(context.resources.configuration).apply { this.fontScale = fontScale }
    val host = context.createConfigurationContext(config)
    val options = Bundle().apply {
      putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, width)
      putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, width)
      putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, height)
      putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, height)
    }
    val views = PrayerWidgetViews.build(host, variant, value, PrayerWidgetModel.snapshot(value, now), now, options)
    val view = roundTrip(views).apply(host, null)
    val density = host.resources.displayMetrics.density
    view.measure(View.MeasureSpec.makeMeasureSpec((width * density).toInt(), View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec((height * density).toInt(), View.MeasureSpec.EXACTLY))
    view.layout(0, 0, view.measuredWidth, view.measuredHeight)
    return view
  }

  private fun texts(view: View): List<TextView> = when (view) {
    is TextView -> listOf(view)
    is ViewGroup -> (0 until view.childCount).flatMap { texts(view.getChildAt(it)) }
    else -> emptyList()
  }

  private fun save(view: View, name: String) {
    val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
    view.draw(Canvas(bitmap))
    val folder = File(context.filesDir, "widget-previews").apply { mkdirs() }
    File(folder, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    bitmap.recycle()
  }

  @Test fun allThreeWidgetsRenderRealDataWithoutRemovedLabels() {
    for ((variant, width, height) in listOf(Triple("large", 340, 240), Triple("compact", 340, 76), Triple("small", 160, 168))) {
      val view = inflate(variant, width, height)
      assertEquals("Əsr", view.findViewById<TextView>(R.id.widget_prayer).text.toString())
      assertEquals("16:08", view.findViewById<TextView>(R.id.widget_time).text.toString())
      assertEquals("38 dəq", view.findViewById<TextView>(R.id.widget_remaining).text.toString())
      assertFalse(texts(view).any { it.text.contains("NÖVBƏTİ") || it.text.contains("qalıb") })
      assertTrue(view.contentDescription.toString().contains("Bakı"))
      if (variant == "large") {
        assertEquals("05:39", view.findViewById<TextView>(R.id.widget_value_fajr).text.toString())
        assertEquals("18:04", view.findViewById<TextView>(R.id.widget_value_maghrib).text.toString())
        assertNotNull(view.findViewById<View>(R.id.widget_cell_asr).background)
        assertNull(view.findViewById<View>(R.id.widget_cell_fajr).background)
      }
      save(view, variant)
    }
  }

  @Test fun narrowWidgetsLongCitiesAndLargeFontsRemainInsideTheHost() {
    for ((variant, width, height) in listOf(Triple("large", 250, 190), Triple("compact", 250, 64), Triple("compact", 250, 40), Triple("small", 110, 120))) {
      for (scale in listOf(1f, 2f)) {
        val view = inflate(variant, width, height, plan.copy(location = "Şabran (Dəvəçi)", timeFormat = "12"), scale)
        assertEquals("4:08 g.s.", view.findViewById<TextView>(R.id.widget_time).text.toString())
        for (text in texts(view)) {
          val bounds = android.graphics.Rect(0, 0, text.width, text.height)
          (view as ViewGroup).offsetDescendantRectToMyCoords(text, bounds)
          assertTrue("$variant $scale: ${text.text} overflows vertically ($bounds / ${view.height})", bounds.bottom <= view.height && bounds.top >= 0)
          assertTrue("$variant $scale: ${text.text} overflows horizontally", bounds.right <= view.width && bounds.left >= 0)
          if (text.id != R.id.widget_location) {
            assertTrue("$variant $scale: ${text.text} is ellipsized", (0 until text.lineCount).none { text.layout.getEllipsisCount(it) > 0 })
            var ancestor = text.parent
            while (ancestor is ViewGroup) {
              val relative = android.graphics.Rect(0, 0, text.width, text.height)
              ancestor.offsetDescendantRectToMyCoords(text, relative)
              assertTrue("$variant $scale: ${text.text} is clipped by a parent", relative.bottom <= ancestor.height && relative.top >= 0)
              if (ancestor == view) break
              ancestor = ancestor.parent
            }
          }
        }
        save(view, "$variant-${if (height == 40) "short" else "narrow"}-$scale")
      }
    }
  }

  @Test fun anUnavailableCalendarClearsPreviewTimesAndProgress() {
    for ((variant, width, height) in listOf(Triple("large", 340, 240), Triple("compact", 340, 76), Triple("small", 160, 168))) {
      val view = inflate(variant, width, height, null)
      assertEquals("Təqvim yoxdur", view.findViewById<TextView>(R.id.widget_prayer).text.toString())
      assertEquals("—", view.findViewById<TextView>(R.id.widget_remaining).text.toString())
      assertFalse(texts(view).any { it.text.toString() in listOf("05:39", "16:08", "18:04") })
      if (variant != "compact") assertEquals(View.INVISIBLE, view.findViewById<View>(R.id.widget_progress).visibility)
      save(view, "$variant-unavailable")
    }
  }
}

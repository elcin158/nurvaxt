package az.nurvaxt.alarm

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Path
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Parcel
import android.view.View
import android.widget.ImageView
import android.widget.RemoteViews
import org.junit.Assert.*
import org.junit.Test
import java.io.File

/** Exercise the actual parcelled launcher RemoteViews, not just the in-app preview. */
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
    return try { views.writeToParcel(parcel, 0); parcel.setDataPosition(0); RemoteViews.CREATOR.createFromParcel(parcel) }
    finally { parcel.recycle() }
  }
  private fun inflate(
    variant: String, width: Int, height: Int, value: WidgetPlan? = plan, fontScale: Float = 1f, light: Boolean = false,
  ): View {
    fun themedContext(light: Boolean) = context.createConfigurationContext(Configuration(context.resources.configuration).apply {
      val nightMode = if (light) Configuration.UI_MODE_NIGHT_NO else Configuration.UI_MODE_NIGHT_YES
      uiMode = (uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or nightMode
      this.fontScale = fontScale
    })
    val host = themedContext(light)
    // Android 12+ must use the launcher's theme even if the provider had another one.
    val provider = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) themedContext(!light) else host
    val options = Bundle().apply {
      putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, width); putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, width)
      putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, height); putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, height)
    }
    val view = roundTrip(PrayerWidgetViews.build(provider, variant, value, PrayerWidgetModel.snapshot(value, now), now, options)).apply(host, null)
    val density = host.resources.displayMetrics.density
    view.measure(View.MeasureSpec.makeMeasureSpec((width * density).toInt(), View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec((height * density).toInt(), View.MeasureSpec.EXACTLY))
    view.layout(0, 0, view.measuredWidth, view.measuredHeight)
    return view
  }
  private fun save(view: View, name: String) {
    val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    // Software captures need the outline clip that the launcher applies in hardware.
    val radius = (view.background as GradientDrawable).cornerRadius
    canvas.clipPath(Path().apply {
      addRoundRect(0f, 0f, view.width.toFloat(), view.height.toFloat(), radius, radius, Path.Direction.CW)
    })
    view.draw(canvas)
    val folder = File(context.filesDir, "widget-previews").apply { mkdirs() }
    File(folder, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    bitmap.recycle()
  }
  private fun dimensions(variant: String): Pair<Int, Int> {
    val design = PrayerWidgetArtwork.design(context, variant)
    val width = when (variant) { "small", "list" -> 170; "vertical" -> 190; else -> 340 }
    return width to (width * design.getDouble("height") / design.getDouble("width")).toInt()
  }
  @Test fun allSevenDesignsRenderDataInTheSystemTheme() {
    assertEquals(7, PrayerWidgetState.providers.size)
    assertEquals(14, PrayerWidgetState.providers.values.flatten().distinct().size)
    for (variant in PrayerWidgetState.providers.keys) for (light in listOf(true, false)) {
      val (width, height) = dimensions(variant)
      val view = inflate(variant, width, height, light = light)
      assertEquals(android.R.id.background, view.id)
      assertTrue(view.clipToOutline)
      val expectedRadius = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        view.resources.getDimensionPixelSize(android.R.dimen.system_app_widget_background_radius).toFloat()
      } else 28f * view.resources.displayMetrics.density
      assertEquals(expectedRadius, (view.background as GradientDrawable).cornerRadius, 0.5f)
      assertEquals(expectedRadius, (view.foreground as GradientDrawable).cornerRadius, 0.5f)
      val label = view.contentDescription.toString()
      listOf("Bakı", "Əsr", "16:08", "38 dəq", "05:39", "18:04").forEach { assertTrue("$variant: $it", label.contains(it)) }
      assertFalse(label.contains("qalıb"))
      val bitmap = (view.findViewById<ImageView>(R.id.widget_artwork).drawable as BitmapDrawable).bitmap
      var red = 0L; var samples = 0
      for (y in 0 until bitmap.height step 5) for (x in 0 until bitmap.width step 5) {
        val color = bitmap.getPixel(x, y)
        if (Color.alpha(color) > 200) { red += Color.red(color); samples++ }
      }
      assertTrue("$variant has no visible artwork", samples > 0)
      val average = red / samples
      if (light) assertTrue("$variant is not light: $average", average > 150)
      else assertTrue("$variant is not dark: $average", average < 100)
      assertTrue(bitmap.allocationByteCount < 4_000_000)
      save(view, if (light) "${variant}_light" else variant)
    }
  }
  @Test fun narrowHostsLongCitiesAndLargeFontsStillRender() {
    for (variant in PrayerWidgetState.providers.keys) for (scale in listOf(1f, 2f)) {
      val (width, height) = dimensions(variant)
      val view = inflate(variant, (width * 0.7f).toInt(), (height * 0.7f).toInt(), plan.copy(location = "Şabran (Dəvəçi)", timeFormat = "12"), scale)
      assertTrue(view.contentDescription.toString().contains("4:08 g.s."))
      assertTrue(view.contentDescription.toString().contains("Şabran (Dəvəçi)"))
      assertEquals(view.width, view.findViewById<ImageView>(R.id.widget_artwork).width)
      save(view, "$variant-narrow-$scale")
    }
  }
  @Test fun unavailableCalendarsClearEveryTimeAndProgress() {
    val snapshot = PrayerWidgetModel.snapshot(null, now)
    val values = PrayerWidgetArtwork.values(null, snapshot, now)
    assertNull(snapshot.progress)
    assertTrue(PrayerWidgetModel.fields.all { values[it] == "—" })
    for (variant in PrayerWidgetState.providers.keys) {
      val (width, height) = dimensions(variant)
      val view = inflate(variant, width, height, null)
      val label = view.contentDescription.toString()
      assertTrue(label.contains("Təqvim yoxdur"))
      assertFalse(listOf("05:39", "16:08", "18:04").any { label.contains(it) })
      save(view, "$variant-unavailable")
    }
  }

  @Test fun resizedHostsHaveNoTransparentBandsAboveBelowOrBesideTheCard() {
    for (variant in PrayerWidgetState.providers.keys) {
      val (width, height) = dimensions(variant)
      for ((w, h, name) in listOf(Triple(width, height + 60, "tall"), Triple(width + 100, height, "wide"))) {
        val view = inflate(variant, w, h)
        val image = view.findViewById<ImageView>(R.id.widget_artwork)
        val bitmap = (image.drawable as BitmapDrawable).bitmap
        assertEquals(ImageView.ScaleType.FIT_XY, image.scaleType)
        for ((x, y) in listOf(
          bitmap.width / 2 to 3, bitmap.width / 2 to bitmap.height - 4,
          3 to bitmap.height / 2, bitmap.width - 4 to bitmap.height / 2,
        )) {
          assertTrue("$variant $name leaves an empty band at $x,$y",
            Color.alpha(bitmap.getPixel(x, y)) > 240)
        }
        save(view, "$variant-fit-$name")
      }
    }
  }
}

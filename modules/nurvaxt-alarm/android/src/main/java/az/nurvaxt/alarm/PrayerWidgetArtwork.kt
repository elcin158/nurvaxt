package az.nurvaxt.alarm

import android.content.Context
import android.graphics.*
import androidx.core.graphics.PathParser
import org.json.JSONObject
import kotlin.math.min
import kotlin.math.roundToInt

/** Shared vector artwork keeps launcher cards and the rendered design previews in sync. */
object PrayerWidgetArtwork {
  private var artwork: JSONObject? = null
  private var bold: Typeface? = null
  private var semi: Typeface? = null
  private fun source(context: Context): JSONObject {
    if (artwork == null) artwork = context.assets.open("designs.json").bufferedReader().use { JSONObject(it.readText()) }
    return artwork!!
  }
  fun design(context: Context, variant: String): JSONObject = source(context).getJSONObject("designs").getJSONObject(variant)

  fun values(plan: WidgetPlan?, snapshot: WidgetSnapshot, now: Long): Map<String, String> {
    val format = plan?.timeFormat ?: "24"
    val prayer = snapshot.next
    val time = prayer?.let { PrayerWidgetModel.time(it.time, format) } ?: "Tətbiqi açın"
    return mutableMapOf(
      "location" to (plan?.location ?: "Şəhər seçin"), "date" to PrayerWidgetModel.displayDate(now),
      "prayer" to (prayer?.name ?: "Təqvim yoxdur"),
      "time" to (if (snapshot.tomorrow) "Sabah · $time" else time),
      "remaining" to (prayer?.let { PrayerWidgetModel.remaining(it.timestamp - now) } ?: "—"),
    ).apply {
      PrayerWidgetModel.fields.forEach { field ->
        put(field, snapshot.day?.prayers?.find { it.field == field }?.let { PrayerWidgetModel.time(it.time, format) } ?: "—")
      }
    }
  }

  fun render(context: Context, variant: String, light: Boolean, values: Map<String, String>, selected: String?, progress: Float?, width: Int, height: Int): Bitmap {
    val source = source(context)
    val design = design(context, variant)
    val palette = source.getJSONObject("palettes").getJSONObject(if (light) "light" else "dark")
    if (bold == null) bold = Typeface.createFromAsset(context.assets, "Manrope-ExtraBold.ttf")
    if (semi == null) semi = Typeface.createFromAsset(context.assets, "Manrope-Bold.ttf")
    val density = min(context.resources.displayMetrics.density, min(2f, 1200f / maxOf(width, height)))
    val bitmap = Bitmap.createBitmap((width * density).roundToInt().coerceAtLeast(1), (height * density).roundToInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val dw = design.getDouble("width").toFloat()
    val dh = design.getDouble("height").toFloat()
    // Fill the host. Positions and sections follow its bounds; glyphs retain their proportions.
    val scaleX = bitmap.width / dw
    val scaleY = bitmap.height / dh
    val scale = min(scaleX, scaleY)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND }
    fun fill(key: String, bounds: RectF) {
      paint.style = Paint.Style.FILL
      paint.shader = null
      val colors = palette.optJSONArray(key)
      if (colors == null) paint.color = Color.parseColor(palette.optString(key, key))
      else paint.shader = LinearGradient(bounds.left, if (key == "moon") bounds.top else bounds.bottom,
        bounds.right, if (key == "moon") bounds.bottom else bounds.top,
        IntArray(colors.length()) { Color.parseColor(colors.getString(it)) }, null, Shader.TileMode.CLAMP)
    }
    fun icon(name: String, x: Float, y: Float, size: Float, color: String) {
      val spec = source.getJSONObject("icons").getJSONObject(name)
      val path = PathParser.createPathFromPathData(spec.getString("d")) ?: return
      path.fillType = Path.FillType.EVEN_ODD
      canvas.save()
      canvas.translate(x, y)
      canvas.scale(size / 32f, size / 32f)
      fill(color, RectF(0f, 0f, 32f, 32f))
      if (spec.getInt("fill") == 0) { paint.style = Paint.Style.STROKE; paint.strokeWidth = 1.5f }
      canvas.drawPath(path, paint)
      canvas.restore()
    }
    // The widget layout clips the artwork and draws the frame at the actual host size.
    val bounds = RectF(0f, 0f, bitmap.width.toFloat(), bitmap.height.toFloat())
    fill(design.getString("background"), bounds)
    canvas.drawRect(bounds, paint)
    if (!light) {
      paint.shader = RadialGradient(bitmap.width.toFloat(), 0f, min(bitmap.width * 0.85f, bitmap.height * 1.6f),
        intArrayOf(Color.parseColor("#F200D4EA"), Color.parseColor("#59007CF0"), Color.parseColor("#00007CF0")),
        floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP)
      canvas.drawRect(bounds, paint)
    }
    val elements = design.getJSONArray("elements")
    for (index in 0 until elements.length()) {
      val e = elements.getJSONObject(index)
      if (e.has("when") && e.getString("when") != selected) continue
      fun number(key: String) = e.optDouble(key, 0.0).toFloat()
      val x = number("x") * scaleX; val y = number("y") * scaleY
      val w = number("width") * scaleX; val h = number("height") * scaleY; val size = number("size") * scale
      val box = RectF(x, y, x + w, y + h)
      when (e.getString("type")) {
        "rect" -> {
          fill(e.getString("fill"), box)
          canvas.drawRoundRect(box, number("radius") * scale, number("radius") * scale, paint)
          if (e.has("stroke")) {
            fill(e.getString("stroke"), box); paint.style = Paint.Style.STROKE; paint.strokeWidth = scale
            canvas.drawRoundRect(box, number("radius") * scale, number("radius") * scale, paint)
          }
        }
        "path" -> {
          val path = PathParser.createPathFromPathData(e.getString("d")) ?: continue
          path.transform(Matrix().apply { setScale(scaleX, scaleY) })
          val pathBounds = RectF().also { path.computeBounds(it, true) }
          fill(e.getString("fill"), pathBounds); canvas.drawPath(path, paint)
          if (e.has("stroke")) {
            fill(e.getString("stroke"), bounds); paint.style = Paint.Style.STROKE; paint.strokeWidth = 0.6f * scale; canvas.drawPath(path, paint)
          }
        }
        "circle" -> { fill(e.getString("fill"), bounds); canvas.drawCircle(x, y, number("radius") * scale, paint) }
        "icon" -> icon(e.getString("name"), x + (number("size") * scaleX - size) / 2,
          y + (number("size") * scaleY - size) / 2, size, e.getString("fill"))
        "progress" -> if (progress != null) {
          val end = x + 7 * scale + (w - 14 * scale) * progress.coerceIn(0f, 1f)
          val half = 4.5f * scale
          fill("track", bounds); canvas.drawRoundRect(x, y - half, x + w, y + half, half, half, paint)
          fill("accent", bounds); canvas.drawRoundRect(x, y - half, end, y + half, half, half, paint)
          fill("#FFFFFF", bounds); canvas.drawCircle(end, y, 7f * scale, paint)
        }
        "text" -> {
          val value = Regex("\\{(\\w+)\\}").replace(e.getString("value")) { values[it.groupValues[1]] ?: "—" }
          fill(e.getString("fill"), bounds)
          paint.typeface = if (e.optString("weight") == "semi") semi else bold
          paint.textSize = size
          val maxWidth = number("maxWidth") * scaleX
          val measured = paint.measureText(value)
          if (measured > maxWidth) paint.textSize *= maxWidth / measured
          val textWidth = paint.measureText(value)
          val textSize = paint.textSize
          paint.textAlign = when (e.optString("align")) { "right" -> Paint.Align.RIGHT; "center" -> Paint.Align.CENTER; else -> Paint.Align.LEFT }
          val baseline = y + paint.textSize * 0.35f * (1 - scaleY / scale)
          canvas.drawText(value, x, baseline, paint)
          if (e.optInt("pin") == 1) icon("pin", x - textWidth - textSize * 1.05f, baseline - textSize * 0.85f, textSize * 0.8f, "location")
        }
      }
    }
    return bitmap
  }
}

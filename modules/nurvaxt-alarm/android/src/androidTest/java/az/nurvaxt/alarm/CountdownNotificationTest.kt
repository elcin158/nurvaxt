package az.nurvaxt.alarm

import android.app.Notification
import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Icon
import android.os.Parcel
import android.view.View
import android.widget.Chronometer
import android.widget.ImageView
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import org.junit.Assert.*
import org.junit.Test

class CountdownNotificationTest {
  companion object { lateinit var context: Context }

  private fun base() = NotificationCompat.Builder(context, CountdownState.CHANNEL)
    .setSmallIcon(R.drawable.nurvaxt_countdown_app_mark)
    .setContentTitle("Sübh · 06:45").setContentText("10 dəq. qalıb")
    .setWhen(System.currentTimeMillis() + 600_000)

  private fun roundTrip(notification: Notification): Notification {
    val parcel = Parcel.obtain()
    try {
      notification.writeToParcel(parcel, 0)
      parcel.setDataPosition(0)
      return Notification.CREATOR.createFromParcel(parcel)
    } finally { parcel.recycle() }
  }

  private fun bounds(bitmap: Bitmap, top: Int, bottom: Int) = Rect().apply {
    for (y in top until bottom) for (x in 0 until bitmap.width) {
      if (bitmap.getPixel(x, y).ushr(24) > 128) union(x, y, x + 1, y + 1)
    }
  }

  private fun standard(notification: Notification) {
    val copy = roundTrip(notification)
    assertNull(copy.contentView)
    assertNull(copy.bigContentView)
    assertNull(copy.headsUpContentView)
    assertTrue(copy.extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER))
    assertTrue(copy.extras.getBoolean(Notification.EXTRA_CHRONOMETER_COUNT_DOWN))
    assertEquals("Sübh · 06:45", copy.extras.getString(Notification.EXTRA_TITLE))
    assertEquals("10 dəq. qalıb", copy.extras.getString(Notification.EXTRA_TEXT))
  }

  @Test fun compactAndExpandedInflateAfterParcelingAcrossAllDisplayStates() {
    val now = System.currentTimeMillis()
    for (night in listOf(Configuration.UI_MODE_NIGHT_NO, Configuration.UI_MODE_NIGHT_YES)) {
      val configured = context.createConfigurationContext(Configuration(context.resources.configuration).apply {
        uiMode = uiMode and Configuration.UI_MODE_NIGHT_MASK.inv() or night
      })
      for (left in listOf(10_800_000L, 1_200_000L, 600_000L, 30_000L)) {
        for (phase in listOf("start", "end")) {
          val prayer = CountdownPrayer("Sübh", "2026-10-12", "06:45", now + left, now - 3_600_000, phase)
          for (kerahat in listOf(emptyList(), listOf(CountdownKerahat("Günçıxma", "2026-10-12",
              now + 60_000, now + 300_000)), listOf(CountdownKerahat("Günçıxma", "2026-10-12",
              now - 60_000, now + 300_000)))) {
            val plan = CountdownPlan(true, "Bakı", if (phase == "end") "12" else "24", listOf(prayer), kerahat)
            val notification = roundTrip(CountdownNotification.build(configured, plan, prayer, now))
            assertNotNull(notification.contentView)
            assertNotNull(notification.bigContentView)
            val compact = notification.contentView.apply(configured, null)
            val expanded = notification.bigContentView.apply(configured, null)
            assertTrue(compact.findViewById<Chronometer>(R.id.countdown_timer).isCountDown)
            assertTrue(expanded.findViewById<Chronometer>(R.id.countdown_timer).isCountDown)
            assertEquals(if (left <= 1_800_000) View.VISIBLE else View.GONE,
              expanded.findViewById<ImageView>(R.id.countdown_symbol).visibility)
            assertNull(CountdownState.prefs(context).getString("notificationViewError", null))
          }
        }
      }
    }
  }

  @Test fun missingCompactLayoutFallsBackBeforePosting() {
    standard(CountdownNotification.customOrStandard(context, base()) {
      RemoteViews(context.packageName, 0x7fffffff) to RemoteViews(context.packageName, R.layout.nurvaxt_countdown_expanded)
    })
    assertNotNull(CountdownState.prefs(context).getString("notificationViewError", null))
  }

  @Test fun imsakCountdownUsesTimeLabelsInTheSystemAndCustomNotification() {
    val now = System.currentTimeMillis()
    val imsak = CountdownPrayer("İmsak", "2026-10-09", "05:21", now + 3_600_000, now - 3_600_000)
    val plan = CountdownPlan(true, "Bakı", "24", listOf(imsak))
    val notification = roundTrip(CountdownNotification.build(context, plan, imsak, now))
    assertEquals("İmsak · 05:21", notification.extras.getString(Notification.EXTRA_TITLE))
    assertTrue(notification.extras.getString(Notification.EXTRA_TEXT)!!.contains("İmsaka qalan vaxt"))
    for (views in listOf(notification.contentView, notification.bigContentView)) {
      val timer = views.apply(context, null).findViewById<Chronometer>(R.id.countdown_timer)
      assertTrue(timer.isCountDown)
      assertTrue(timer.contentDescription.toString().startsWith("İmsak vaxtına "))
    }
  }

  @Test fun missingExpandedLayoutAlsoFallsBack() {
    standard(CountdownNotification.customOrStandard(context, base()) {
      RemoteViews(context.packageName, R.layout.nurvaxt_countdown_compact) to RemoteViews(context.packageName, 0x7fffffff)
    })
  }

  @Test fun missingNestedLayoutFallsBack() {
    standard(CountdownNotification.customOrStandard(context, base()) {
      RemoteViews(context.packageName, R.layout.nurvaxt_countdown_compact) to
        RemoteViews(context.packageName, R.layout.nurvaxt_countdown_expanded).apply {
          addView(R.id.countdown_kerahat, RemoteViews(context.packageName, 0x7fffffff))
        }
    })
  }

  @Test fun invalidRemoteViewsActionFallsBack() {
    standard(CountdownNotification.customOrStandard(context, base()) {
      RemoteViews(context.packageName, R.layout.nurvaxt_countdown_compact).apply {
        setInt(R.id.countdown_stage, "methodThatDoesNotExist", 1)
      } to RemoteViews(context.packageName, R.layout.nurvaxt_countdown_expanded)
    })
  }

  @Test fun startupUsesAppBitmapAndNoCustomLayouts() {
    val notification = roundTrip(CountdownNotification.startup(context))
    assertEquals(Icon.TYPE_BITMAP, notification.smallIcon.type)
    val mark = (notification.smallIcon.loadDrawable(context) as BitmapDrawable).bitmap
    val source = requireNotNull(BitmapFactory.decodeResource(context.resources, R.drawable.nurvaxt_countdown_app_mark))
    assertEquals(96, mark.width)
    assertEquals(96, mark.height)
    val original = bounds(source, 0, source.height)
    val enlarged = bounds(mark, 0, mark.height)
    // The mark is scaled until its longer axis touches the bitmap's edges; alpha bounds can round
    // at both edges when the bitmap is filtered.
    val scale = 96.0 / maxOf(original.width(), original.height())
    assertEquals("Standalone wordmark width", original.width() * scale, enlarged.width().toDouble(), 2.0)
    assertEquals("Standalone wordmark height", original.height() * scale, enlarged.height().toDouble(), 2.0)
    assertTrue("Standalone wordmark leaves the slot unused",
      enlarged.width() >= 95 || enlarged.height() >= 95)
    assertEquals(48f, enlarged.exactCenterX(), 1f)
    assertEquals(48f, enlarged.exactCenterY(), 1f)
    assertTrue("Standalone wordmark is clipped", enlarged.left >= 0 && enlarged.right <= 96 &&
      enlarged.top >= 0 && enlarged.bottom <= 96)
    assertNull(notification.contentView)
    assertNull(notification.bigContentView)
  }

  @Test fun statusIconStacksWordmarkAboveTimeAndPreservesDurationBoundaries() {
    val now = System.currentTimeMillis()
    fun icon(left: Long) = CountdownPrayer("Sübh", "2026-10-12", "06:45", now + left, null).let { prayer ->
      val notification = CountdownNotification.build(context, CountdownPlan(true, "Bakı", "24", listOf(prayer)), prayer, now)
      (notification.smallIcon.loadDrawable(context) as BitmapDrawable).bitmap
    }
    val stackedMark = icon(40 * 60_000L)
    val artwork = bounds(stackedMark, 0, 48)
    assertFalse("Wordmark is missing above the time", artwork.isEmpty)
    assertTrue("Wordmark overlaps the time", artwork.bottom <= 48)
    assertTrue("Wordmark leaves its row unused", artwork.height() >= 42)
    assertEquals(48f, artwork.exactCenterX(), 2f)
    for (left in listOf(1_000L, 30_000L, 59_000L, 59_999L, 60_000L, 120_000L,
        40 * 60_000L, 59 * 60_000L, 3_599_999L)) {
      val count = icon(left)
      assertEquals(96, count.width)
      assertEquals(96, count.height)
      val number = bounds(count, 48, 96)
      assertTrue("Duration is too small: $left", number.height() >= 36)
      assertEquals(48f, number.exactCenterX(), 2f)
      assertEquals(72f, number.exactCenterY(), 2f)
      assertTrue("Duration is clipped: $left ${number.toShortString()}", number.left >= 2 && number.right <= 94)
      assertTrue("Duration overlaps the wordmark: $left", number.top >= 50 && number.bottom <= 94)
      for (y in 0 until 48) for (x in 0 until 96) {
        assertEquals("Wordmark changed with duration: $left", stackedMark.getPixel(x, y), count.getPixel(x, y))
      }
    }
    assertTrue(icon(59_000).sameAs(icon(59 * 60_000L)))
    assertTrue(icon(60_000).sameAs(icon(1_000)))
    assertTrue(icon(60_001).sameAs(icon(2 * 60_000L)))
    assertFalse(icon(59_999).sameAs(icon(60_000)))
    assertTrue(icon(1_001).sameAs(icon(2_000)))
    assertTrue(icon(0).sameAs(icon(1_000)))
    assertFalse(icon(40 * 60_000L).sameAs(icon(39 * 60_000L)))
    val mark = (CountdownNotification.appIcon(context).toIcon(context).loadDrawable(context) as BitmapDrawable).bitmap
    for (left in listOf(3_600_000L, 3_600_001L, 99 * 60_000L, 180 * 60_000L, 24 * 3_600_000L)) {
      assertTrue("Expected only the app icon: $left", icon(left).sameAs(mark))
    }
    assertFalse(icon(3_599_999L).sameAs(mark))
  }
}

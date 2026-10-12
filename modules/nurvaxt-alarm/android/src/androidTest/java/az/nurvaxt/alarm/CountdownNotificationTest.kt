package az.nurvaxt.alarm

import android.app.Notification
import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Rect
import android.graphics.drawable.BitmapDrawable
import android.os.Parcel
import android.widget.Chronometer
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import org.junit.Assert.*
import org.junit.Test

class CountdownNotificationTest {
  companion object { lateinit var context: Context }

  private fun base() = NotificationCompat.Builder(context, CountdownState.CHANNEL)
    .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
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
              now + 60_000, now + 300_000, now - 600_000)), listOf(CountdownKerahat("Günçıxma", "2026-10-12",
              now - 60_000, now + 300_000, now - 600_000)))) {
            val plan = CountdownPlan(true, "Bakı", if (phase == "end") "12" else "24", listOf(prayer), kerahat)
            val notification = roundTrip(CountdownNotification.build(configured, plan, prayer, now))
            assertNotNull(notification.contentView)
            assertNotNull(notification.bigContentView)
            val compact = notification.contentView.apply(configured, null)
            val expanded = notification.bigContentView.apply(configured, null)
            assertTrue(compact.findViewById<Chronometer>(R.id.countdown_timer).isCountDown)
            assertTrue(expanded.findViewById<Chronometer>(R.id.countdown_timer).isCountDown)
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

  @Test fun startupUsesOnlySystemResourcesAndNoCustomLayouts() {
    val notification = roundTrip(CountdownNotification.startup(context))
    assertEquals("android", notification.smallIcon.resPackage)
    assertEquals(android.R.drawable.ic_lock_idle_alarm, notification.smallIcon.resId)
    assertNull(notification.contentView)
    assertNull(notification.bigContentView)
  }

  @Test fun statusIconShowsOnlyTimeAndPreservesMinuteSecondBoundaries() {
    val now = System.currentTimeMillis()
    fun icon(left: Long) = CountdownPrayer("Sübh", "2026-10-12", "06:45", now + left, null).let { prayer ->
      val notification = CountdownNotification.build(context, CountdownPlan(true, "Bakı", "24", listOf(prayer)), prayer, now)
      (notification.smallIcon.loadDrawable(context) as BitmapDrawable).bitmap
    }
    for (minutes in listOf(1, 2, 40, 59, 60, 99)) {
      val count = icon(minutes * 60_000L)
      assertEquals(96, count.width)
      assertEquals(96, count.height)
      val bounds = Rect()
      for (y in 0 until 96) for (x in 0 until 96) {
        if (count.getPixel(x, y).ushr(24) > 128) bounds.union(x, y, x + 1, y + 1)
      }
      // A single large, centered count replaces the old two-row mark/count icon.
      assertTrue("Count is too small: $minutes", bounds.height() > 50)
      assertEquals(48f, bounds.exactCenterX(), 2f)
      assertEquals(48f, bounds.exactCenterY(), 2f)
      assertTrue(bounds.top >= 10 && bounds.bottom <= 86)
    }
    assertTrue(icon(59_000).sameAs(icon(59 * 60_000L)))
    assertTrue(icon(60_000).sameAs(icon(1_000)))
    assertTrue(icon(60_001).sameAs(icon(2 * 60_000L)))
    assertTrue(icon(1_001).sameAs(icon(2_000)))
    assertTrue(icon(0).sameAs(icon(1_000)))
    assertFalse(icon(40 * 60_000L).sameAs(icon(39 * 60_000L)))
    val clock = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
    requireNotNull(context.getDrawable(R.drawable.nurvaxt_countdown_clock)).apply {
      setBounds(0, 0, 96, 96)
      draw(Canvas(clock))
    }
    assertTrue(icon(99 * 60_000L + 1).sameAs(clock))
    assertTrue(icon(180 * 60_000L).sameAs(clock))
    assertFalse(icon(99 * 60_000L).sameAs(clock))
  }
}

package az.nurvaxt.alarm

import android.app.Notification
import android.content.Context
import android.content.res.Configuration
import android.graphics.BitmapFactory
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

  @Test fun statusIconRestoresMarkAndCountAndUsesInlineArtworkForLongDurations() {
    val now = System.currentTimeMillis()
    fun icon(left: Long) = CountdownPrayer("Sübh", "2026-10-12", "06:45", now + left, null).let { prayer ->
      val notification = CountdownNotification.build(context, CountdownPlan(true, "Bakı", "24", listOf(prayer)), prayer, now)
      (notification.smallIcon.loadDrawable(context) as BitmapDrawable).bitmap
    }
    val short = icon(40 * 60_000L)
    assertEquals(96, short.width)
    assertEquals(96, short.height)
    assertTrue((0 until 48).any { y -> (0 until 96).any { x -> short.getPixel(x, y).ushr(24) > 128 } })
    assertTrue((48 until 96).any { y -> (0 until 96).any { x -> short.getPixel(x, y).ushr(24) > 128 } })
    val mark = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    assertTrue(mark != 0)
    assertTrue(icon(180 * 60_000L).sameAs(BitmapFactory.decodeResource(context.resources, mark)))
  }
}

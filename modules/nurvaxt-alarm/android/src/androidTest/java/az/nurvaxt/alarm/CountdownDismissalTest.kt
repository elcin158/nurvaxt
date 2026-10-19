package az.nurvaxt.alarm

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class CountdownDismissalTest {
  companion object { lateinit var context: Context }
  private val manager get() = context.getSystemService(NotificationManager::class.java)

  private fun awaitState(description: String, condition: () -> Boolean) {
    repeat(60) {
      if (condition()) return
      Thread.sleep(50)
    }
    throw AssertionError(description)
  }

  private fun plan(enabled: Boolean = true, future: Boolean = true): CountdownPlan {
    val now = System.currentTimeMillis()
    val date = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply {
      timeZone = TimeZone.getTimeZone("Asia/Baku")
    }.format(Date(now))
    val time = now + if (future) 1_200_000 else -1_000
    val event = JSONObject().put("name", "Zöhr").put("date", date).put("time", "12:25")
      .put("timestamp", time).put("previousTimestamp", now - 3_600_000)
    CountdownState.prefs(context).edit().putString("plan", JSONObject().put("enabled", enabled)
      .put("location", "Bakı").put("timeFormat", "24").put("events", JSONArray().put(event)).toString())
      .putBoolean("active", true).commit()
    return requireNotNull(CountdownState.read(context))
  }

  @Before fun before() {
    manager.cancelAll()
    CountdownState.prefs(context).edit().clear().commit()
    awaitState("Previous cards were not removed") { manager.activeNotifications.isEmpty() }
    Thread.sleep(1_100)
  }

  @After fun after() {
    CountdownState.prefs(context).edit().clear().commit()
    manager.cancelAll()
    awaitState("Test cards were not removed") { manager.activeNotifications.isEmpty() }
  }

  @Test fun ordinaryCardDeleteIntentRestoresOnlyTheSilentCountdownImmediately() {
    val plan = plan()
    val marker = 12345L
    CountdownState.prefs(context).edit().putLong(CountdownLiveUpdate.DISMISSED_PRAYER, marker).commit()
    val original = CountdownNotification.build(context, plan, plan.events.first(), System.currentTimeMillis())
    assertNotNull(original.deleteIntent)
    manager.notify(CountdownState.NOTIFICATION_ID, original)
    awaitState("Countdown was not posted") { manager.activeNotifications.any { it.id == CountdownState.NOTIFICATION_ID } }
    manager.cancel(CountdownState.NOTIFICATION_ID)
    awaitState("Countdown was not removed") { manager.activeNotifications.isEmpty() }
    val start = android.os.SystemClock.elapsedRealtime()
    original.deleteIntent.send()
    awaitState("Countdown was not restored by its actual delete PendingIntent") {
      manager.activeNotifications.any { it.id == CountdownState.NOTIFICATION_ID }
    }
    assertTrue(android.os.SystemClock.elapsedRealtime() - start < 3_000)
    val active = manager.activeNotifications
    assertEquals(1, active.size)
    val restored = active.single().notification
    assertEquals(CountdownState.GROUP, restored.group)
    assertEquals(CountdownState.CHANNEL, restored.channelId)
    assertTrue(restored.flags and Notification.FLAG_ONGOING_EVENT != 0)
    assertTrue(restored.flags and Notification.FLAG_ONLY_ALERT_ONCE != 0)
    assertEquals(0, restored.flags and Notification.FLAG_AUTO_CANCEL)
    assertEquals(marker, CountdownState.prefs(context).getLong(CountdownLiveUpdate.DISMISSED_PRAYER, 0))
  }

  @Test fun disabledCountdownIsNotResurrected() {
    plan(enabled = false)
    CountdownState.restoreDismissedNotification(context)
    assertTrue(manager.activeNotifications.isEmpty())
  }

  @Test fun stoppedCountdownServiceIsNotResurrected() {
    plan()
    CountdownState.prefs(context).edit().putBoolean("active", false).commit()
    CountdownState.restoreDismissedNotification(context)
    assertTrue(manager.activeNotifications.isEmpty())
  }

  @Test fun expiredTimetableDoesNotPostAStaleCard() {
    plan(future = false)
    CountdownState.restoreDismissedNotification(context)
    assertTrue(manager.activeNotifications.isEmpty())
  }

  @Test fun startupAcknowledgementAlsoHasTheRecoveryIntent() {
    assertNotNull(CountdownNotification.startup(context).deleteIntent)
  }
}

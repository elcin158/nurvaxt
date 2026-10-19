package az.nurvaxt.alarm

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import androidx.core.app.NotificationCompat
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

class ReminderNotificationTest {
  companion object { lateinit var context: Context }
  private val manager get() = context.getSystemService(NotificationManager::class.java)

  private fun awaitState(description: String, condition: () -> Boolean) {
    repeat(60) {
      if (condition()) return
      Thread.sleep(50)
    }
    throw AssertionError(description)
  }

  @Before fun before() {
    manager.cancelAll()
    awaitState("Previous notifications were not removed") { manager.activeNotifications.isEmpty() }
    // Android throttles bursts of updates; each test represents separate real-world arrivals.
    Thread.sleep(1_100)
  }
  @After fun after() {
    manager.cancelAll()
    awaitState("Test notifications were not removed") { manager.activeNotifications.isEmpty() }
  }

  private fun event(id: Int, time: Long = System.currentTimeMillis()) =
    JSONObject().put("id", "nurvaxt:test:$id").put("timestamp", time)
      .put("body", "Zöhr namazına $id dəqiqə qalıb.").put("sound", "default").put("vibration", true)

  private fun card(count: Int): Notification {
    repeat(60) {
      val notification = manager.activeNotifications.firstOrNull { it.id == ReminderNotification.NOTIFICATION_ID }?.notification
      if (notification != null && JSONArray(notification.extras.getString(ReminderNotification.EXTRA_ENTRIES)).length() == count) {
        return notification
      }
      Thread.sleep(50)
    }
    throw AssertionError("Expected one combined card with $count entries")
  }

  @Test fun separateDeliveriesReuseOneCardAndKeepCountdownIndependent() {
    manager.notify(CountdownState.NOTIFICATION_ID, CountdownNotification.startup(context))
    val now = System.currentTimeMillis()
    ReminderNotification.post(context, listOf(event(15, now - 600_000)))
    card(1)
    ReminderNotification.post(context, listOf(event(5, now)))
    val combined = card(2)
    val active = manager.activeNotifications
    assertEquals(1, active.count { it.id == ReminderNotification.NOTIFICATION_ID })
    assertTrue(active.any { it.id == CountdownState.NOTIFICATION_ID })
    assertEquals(ReminderNotification.GROUP, combined.group)
    assertNotEquals(CountdownState.GROUP, combined.group)
    assertEquals("Zöhr namazına 5 dəqiqə qalıb.", combined.extras.getString(Notification.EXTRA_TEXT))
    val expanded = combined.extras.getCharSequence(Notification.EXTRA_BIG_TEXT).toString()
    assertTrue(expanded.indexOf("5 dəqiqə") < expanded.indexOf("15 dəqiqə"))
    assertEquals(0, combined.flags and Notification.FLAG_ONGOING_EVENT)
    assertEquals(0, combined.flags and Notification.FLAG_ONLY_ALERT_ONCE)
    val countdown = active.first { it.id == CountdownState.NOTIFICATION_ID }.notification
    assertTrue(countdown.flags and Notification.FLAG_ONGOING_EVENT != 0)
    val summary = active.first { it.id == CountdownState.SUMMARY_ID }.notification
    assertEquals(ReminderNotification.GROUP, summary.group)
    assertTrue(summary.flags and Notification.FLAG_ONLY_ALERT_ONCE != 0)
    assertEquals(Notification.GROUP_ALERT_CHILDREN, summary.groupAlertBehavior)
  }

  @Test fun clearingRemindersStartsFreshWithoutCancelingCountdown() {
    manager.notify(CountdownState.NOTIFICATION_ID, CountdownNotification.startup(context))
    ReminderNotification.post(context, listOf(event(15)))
    card(1)
    manager.cancel(ReminderNotification.NOTIFICATION_ID)
    awaitState("Reminder was not removed") { manager.activeNotifications.none { it.id == ReminderNotification.NOTIFICATION_ID } }
    ReminderDismissReceiver().onReceive(context, Intent())
    assertFalse(manager.activeNotifications.any { it.id == CountdownState.SUMMARY_ID })
    assertTrue(manager.activeNotifications.any { it.id == CountdownState.NOTIFICATION_ID })
    ReminderNotification.post(context, listOf(event(5)))
    val saved = JSONArray(card(1).extras.getString(ReminderNotification.EXTRA_ENTRIES))
    assertEquals("nurvaxt:test:5", saved.getJSONObject(0).getString("id"))
  }

  @Test fun upgradeConsolidatesLegacyCardsSilentlyAndPreservesTheirText() {
    ReminderNotification.post(context, listOf(event(30)))
    card(1)
    for (id in listOf(10, 5)) manager.notify(id, NotificationCompat.Builder(context, "nurvaxt-default-true-v1")
      .setSmallIcon(R.drawable.nurvaxt_countdown_app_mark).setContentTitle("NurVaxt")
      .setContentText("Köhnə xatırlatma $id").setGroup("nurvaxt").setAutoCancel(true).build())
    awaitState("Legacy reminders were not posted") { manager.activeNotifications.count { it.id == 10 || it.id == 5 } == 2 }
    Thread.sleep(1_100)
    ReminderNotification.migrate(context)
    val combined = card(3)
    assertTrue(combined.flags and Notification.FLAG_ONLY_ALERT_ONCE != 0)
    awaitState("Legacy cards were not removed") { manager.activeNotifications.none { it.id == 10 || it.id == 5 } }
    assertFalse(manager.activeNotifications.any { it.id == 10 || it.id == 5 })
    val text = combined.extras.getCharSequence(Notification.EXTRA_BIG_TEXT).toString()
    assertTrue(text.contains("Köhnə xatırlatma 10"))
    assertTrue(text.contains("Köhnə xatırlatma 5"))
    assertTrue(text.contains("30 dəqiqə"))
  }

  @Test fun simultaneousEventsAreDeduplicatedAndHistoryStaysBounded() {
    val now = System.currentTimeMillis()
    ReminderNotification.post(context, (1..55).map { event(it, now + it) } + event(55, now + 55))
    val saved = JSONArray(card(50).extras.getString(ReminderNotification.EXTRA_ENTRIES))
    assertEquals("nurvaxt:test:55", saved.getJSONObject(0).getString("id"))
    assertEquals("nurvaxt:test:6", saved.getJSONObject(49).getString("id"))
  }

  @Test fun singleMessageLayoutsInflateAtLargeFontSizesAndInBothThemes() {
    for (night in listOf(Configuration.UI_MODE_NIGHT_NO, Configuration.UI_MODE_NIGHT_YES)) {
      for (font in listOf(1f, 1.3f, 2f)) {
        manager.cancelAll()
        awaitState("Previous font preview was not removed") { manager.activeNotifications.isEmpty() }
        Thread.sleep(1_100)
        val configured = context.createConfigurationContext(Configuration(context.resources.configuration).apply {
          uiMode = uiMode and Configuration.UI_MODE_NIGHT_MASK.inv() or night
          fontScale = font
        })
        ReminderNotification.post(configured, listOf(event(15)))
        val single = card(1)
        for (views in listOfNotNull(single.contentView, single.bigContentView, single.headsUpContentView)) {
          assertNotNull(views.apply(configured, null))
        }
      }
    }
  }

  fun preview() {
    manager.cancelAll()
    val now = System.currentTimeMillis()
    val format = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("Asia/Baku") }
    val prayer = CountdownPrayer("Zöhr", format.format(Date(now)), "13:30", now + 1_200_000, now - 3_600_000)
    manager.notify(CountdownState.NOTIFICATION_ID,
      CountdownNotification.build(context, CountdownPlan(true, "Bakı", "24", listOf(prayer)), prayer, now))
    for (offset in listOf(15, 10, 5)) {
      ReminderNotification.post(context, listOf(event(offset, now - (offset - 5) * 60_000L)))
      Thread.sleep(1_100)
    }
    card(3)
  }
}

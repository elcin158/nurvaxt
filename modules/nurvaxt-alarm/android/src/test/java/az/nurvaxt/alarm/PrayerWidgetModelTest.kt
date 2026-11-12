package az.nurvaxt.alarm

import org.junit.Assert.*
import org.junit.Test
import java.util.TimeZone

class PrayerWidgetModelTest {
  private fun stamp(date: String, time: String) = PrayerWidgetModel.timestamp(date, time)
  private fun day(date: String) = WidgetDay(date, listOf(
    WidgetPrayer("fajr", "Sübh", "05:39", stamp(date, "05:39")),
    WidgetPrayer("dhuhr", "Zöhr", "12:25", stamp(date, "12:25")),
    WidgetPrayer("asr", "Əsr", "16:08", stamp(date, "16:08")),
    WidgetPrayer("maghrib", "Məğrib", "18:04", stamp(date, "18:04")),
    WidgetPrayer("isha", "İşa", "19:05", stamp(date, "19:05")),
  ))
  private val plan = WidgetPlan("Bakı", "24", listOf(day("2026-10-21"), day("2026-10-22"), day("2026-10-23")))

  @Test fun nextPrayerAndProgressUseTheFivePrayerTimeline() {
    val snapshot = PrayerWidgetModel.snapshot(plan, stamp("2026-10-22", "15:30"))
    assertEquals("asr", snapshot.next!!.field)
    assertEquals("38 dəq", PrayerWidgetModel.remaining(snapshot.next.timestamp - stamp("2026-10-22", "15:30")))
    assertTrue(snapshot.progress!! in 0.82f..0.84f)
    assertFalse(snapshot.tomorrow)
    assertEquals("dhuhr", PrayerWidgetModel.snapshot(plan, stamp("2026-10-22", "05:39")).next!!.field)
    assertEquals("maghrib", PrayerWidgetModel.snapshot(plan, stamp("2026-10-22", "16:08")).next!!.field)
  }

  @Test fun tomorrowAndMidnightRolloverKeepTheCorrectDailyStrip() {
    val tonight = PrayerWidgetModel.snapshot(plan, stamp("2026-10-22", "19:05"))
    assertTrue(tonight.tomorrow)
    assertEquals("fajr", tonight.next!!.field)
    assertEquals("2026-10-22", tonight.day!!.date)
    val midnight = PrayerWidgetModel.snapshot(plan, stamp("2026-10-23", "00:00"))
    assertFalse(midnight.tomorrow)
    assertEquals("2026-10-23", midnight.day!!.date)
    assertEquals(tonight.next, midnight.next)
    assertEquals(tonight.progress!!, 0f, 0.001f)
  }

  @Test fun missingTodayTomorrowAndExpiredCalendarsNeverShowInventedTimes() {
    val gap = plan.copy(days = listOf(day("2026-10-21"), day("2026-10-23")))
    assertNull(PrayerWidgetModel.snapshot(gap, stamp("2026-10-22", "15:30")).next)
    val last = PrayerWidgetModel.snapshot(plan, stamp("2026-10-23", "19:05"))
    assertNotNull(last.day)
    assertNull(last.next)
    assertNull(last.progress)
    assertNull(PrayerWidgetModel.snapshot(plan, stamp("2027-01-01", "00:00")).day)
    assertNull(PrayerWidgetModel.snapshot(null, stamp("2026-10-22", "15:30")).next)
  }

  @Test fun allDatesAndTimestampsRemainInBakuWhenDeviceTimezoneChanges() {
    val original = TimeZone.getDefault()
    try {
      TimeZone.setDefault(TimeZone.getTimeZone("America/Los_Angeles"))
      assertEquals(1_792_657_800_000L, stamp("2026-10-22", "12:30"))
      assertEquals("2026-10-23", PrayerWidgetModel.date(stamp("2026-10-23", "00:01")))
      assertEquals("2027-01-01", PrayerWidgetModel.shift("2026-12-31", 1))
      assertEquals("2026-10-22", PrayerWidgetModel.snapshot(plan, stamp("2026-10-22", "00:00")).date)
    } finally { TimeZone.setDefault(original) }
  }

  @Test fun durationsRoundUpAndTimeFormatsUseTheAppConventions() {
    assertEquals("1 dəq", PrayerWidgetModel.remaining(1))
    assertEquals("1 dəq", PrayerWidgetModel.remaining(60_000))
    assertEquals("2 dəq", PrayerWidgetModel.remaining(60_001))
    assertEquals("1 s 0 dəq", PrayerWidgetModel.remaining(3_600_000))
    assertEquals("10 s 5 dəq", PrayerWidgetModel.remaining(36_300_000))
    assertEquals("12:05 g.ə.", PrayerWidgetModel.time("00:05", "12"))
    assertEquals("12:25 g.s.", PrayerWidgetModel.time("12:25", "12"))
    assertEquals("4:08 g.s.", PrayerWidgetModel.time("16:08", "12"))
    assertEquals("16:08", PrayerWidgetModel.time("16:08", "24"))
  }

  @Test fun refreshUsesMinutePrayerAndMidnightBoundaries() {
    val now = stamp("2026-10-22", "15:30") + 32_000
    assertEquals(stamp("2026-10-22", "15:31"), PrayerWidgetModel.nextUpdate(PrayerWidgetModel.snapshot(plan, now), now))
    val last = stamp("2026-10-23", "19:05")
    assertEquals(stamp("2026-10-24", "00:00"), PrayerWidgetModel.nextUpdate(PrayerWidgetModel.snapshot(plan, last), last))
    val first = plan.copy(days = listOf(day("2026-10-22")))
    assertNull(PrayerWidgetModel.snapshot(first, stamp("2026-10-22", "00:00")).progress)
  }
}

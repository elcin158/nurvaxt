package az.nurvaxt.alarm

import org.junit.Assert.*
import org.junit.Test
import java.time.ZonedDateTime

class CountdownStateTest {
  private fun stamp(time: String): Long =
    ZonedDateTime.parse("2026-10-08T$time+04:00").toInstant().toEpochMilli()

  @Test fun ishaAdvancesToImsakAcrossMidnightThenFajr() {
    val isha = CountdownPrayer("İşa", "2026-10-08", "19:25", stamp("19:25:00"), null)
    val imsak = CountdownPrayer("İmsak", "2026-10-09", "05:21", stamp("05:21:00") + 86_400_000, isha.timestamp)
    val fajr = CountdownPrayer("Sübh", "2026-10-09", "05:26", stamp("05:26:00") + 86_400_000, imsak.timestamp)
    val plan = CountdownPlan(true, "Bakı", "24", listOf(isha, imsak, fajr))
    val midnight = stamp("00:00:00") + 86_400_000
    assertEquals(isha, CountdownState.next(plan, isha.timestamp - 1))
    assertEquals(imsak, CountdownState.next(plan, isha.timestamp))
    assertEquals(imsak, CountdownState.next(plan, midnight - 1))
    assertEquals(imsak, CountdownState.next(plan, midnight))
    assertEquals(imsak, CountdownState.next(plan, imsak.timestamp - 1))
    assertEquals(fajr, CountdownState.next(plan, imsak.timestamp))
    assertEquals(fajr, CountdownState.next(plan, fajr.timestamp - 1))
  }

  @Test fun fajrContinuesUntilSunriseThenAdvancesToDhuhr() {
    val start = CountdownPrayer("Sübh", "2026-10-08", "05:25", stamp("05:25:00"), null)
    val end = CountdownPrayer("Sübh", "2026-10-08", "06:44", stamp("06:44:00"), start.timestamp, "end")
    val dhuhr = CountdownPrayer("Zöhr", "2026-10-08", "12:28", stamp("12:28:00"), end.timestamp)
    val plan = CountdownPlan(true, "Bakı", "24", listOf(start, end, dhuhr))
    assertEquals(start, CountdownState.next(plan, start.timestamp - 1))
    assertEquals(end, CountdownState.next(plan, start.timestamp))
    assertEquals(end, CountdownState.next(plan, end.timestamp - 1))
    assertEquals(dhuhr, CountdownState.next(plan, end.timestamp))
  }

  @Test fun legacyPrayerDefaultsToStartAndMissingTomorrowIsNotSkipped() {
    val prayer = CountdownPrayer("Sübh", "2026-10-10", "05:27", stamp("05:27:00") + 2 * 86_400_000, null)
    assertEquals("start", prayer.phase)
    assertNull(CountdownState.next(CountdownPlan(true, "Bakı", "24", listOf(prayer)), stamp("23:00:00")))
  }
}

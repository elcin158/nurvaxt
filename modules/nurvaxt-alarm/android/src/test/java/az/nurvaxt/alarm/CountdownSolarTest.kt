package az.nurvaxt.alarm

import org.junit.Assert.*
import org.junit.Test

class CountdownSolarTest {
  private val morning = CountdownKerahat("Günçıxma", "2026-10-12", 3_000, 4_000)

  @Test fun activeKerahatCoversItsOwnInterval() {
    assertNull(CountdownSolar.kerahat(listOf(morning), 2_999))
    assertEquals(morning, CountdownSolar.kerahat(listOf(morning), 3_000))
    assertEquals(morning, CountdownSolar.kerahat(listOf(morning), 3_999))
    assertNull(CountdownSolar.kerahat(listOf(morning), 4_000))
    assertNull(CountdownSolar.kerahat(emptyList(), 3_000))
  }

  @Test fun theRunningIntervalIsChosenWhileALaterOneWaits() {
    val noon = CountdownKerahat("Zəval", "2026-10-12", 5_000, 6_000)
    assertEquals(morning, CountdownSolar.kerahat(listOf(morning, noon), 3_500))
    assertNull(CountdownSolar.kerahat(listOf(morning, noon), 4_500))
    assertEquals(noon, CountdownSolar.kerahat(listOf(morning, noon), 5_000))
  }

  @Test fun visualAlarmSelectsOnlyTheNextFutureSolarBoundary() {
    assertEquals(3_000L, CountdownSolar.boundary(listOf(morning), 2_999))
    assertEquals(4_000L, CountdownSolar.boundary(listOf(morning), 3_000))
    assertNull(CountdownSolar.boundary(listOf(morning), 4_000))
    assertNull(CountdownSolar.boundary(emptyList(), 0))
  }

  @Test fun approachingKerahatIsLimitedToTheDisplayedPrayer() {
    assertNull(CountdownSolar.countdown(listOf(morning), 2_000, 2_999))
    val pending = CountdownSolar.countdown(listOf(morning), 2_000, 3_000)!!
    assertEquals(morning, pending.event)
    assertFalse(pending.active)
    assertEquals(3_000L, pending.target)
  }

  @Test fun entryCountdownSwitchesToExitAtTheStartAndDisappearsAtTheEnd() {
    assertEquals(3_000L, CountdownSolar.countdown(listOf(morning), 2_999, 5_000)!!.target)
    val active = CountdownSolar.countdown(listOf(morning), 3_000, 5_000)!!
    assertTrue(active.active)
    assertEquals(4_000L, active.target)
    assertTrue(CountdownSolar.countdown(listOf(morning), 3_999, 5_000)!!.active)
    assertNull(CountdownSolar.countdown(listOf(morning), 4_000, 5_000))
  }

  @Test fun activeIntervalTakesPriorityAndCanContinueBeyondThePrayerBoundary() {
    val noon = CountdownKerahat("Zəval", "2026-10-12", 5_000, 6_000)
    val active = CountdownSolar.countdown(listOf(noon, morning), 3_500, 3_800)!!
    assertEquals(morning, active.event)
    assertTrue(active.active)
    assertEquals(4_000L, active.target)
  }

  @Test fun earliestRelevantFutureIntervalIsSelectedAndEmptyOrInvalidPlansStayHidden() {
    val noon = CountdownKerahat("Zəval", "2026-10-12", 5_000, 6_000)
    assertEquals(morning, CountdownSolar.countdown(listOf(noon, morning), 2_000, 7_000)!!.event)
    assertNull(CountdownSolar.countdown(emptyList(), 2_000, 7_000))
    assertNull(CountdownSolar.countdown(listOf(morning.copy(end = morning.start)), 2_000, 7_000))
    assertNull(CountdownSolar.countdown(listOf(noon), 4_000, 4_999))
  }
}

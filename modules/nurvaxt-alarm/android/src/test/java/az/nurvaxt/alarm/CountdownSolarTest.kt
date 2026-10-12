package az.nurvaxt.alarm

import org.junit.Assert.*
import org.junit.Test

class CountdownSolarTest {
  private val morning = CountdownKerahat("Günçıxma", "2026-10-12", 3_000, 4_000, 2_000)

  @Test fun kerahatTracksWarningStartAndBothIntervalBoundaries() {
    assertNull(CountdownSolar.kerahat(listOf(morning), 1_999))
    assertEquals(morning, CountdownSolar.kerahat(listOf(morning), 2_000))
    assertEquals(morning, CountdownSolar.kerahat(listOf(morning), 3_000))
    assertNull(CountdownSolar.kerahat(listOf(morning), 4_000))
    assertNull(CountdownSolar.kerahat(emptyList(), 3_000))
  }

  @Test fun activeKerahatTakesPriorityAndZeroWarningStillShowsTheActiveInterval() {
    val noon = CountdownKerahat("Zəval", "2026-10-12", 5_000, 6_000, 3_000)
    assertEquals(morning, CountdownSolar.kerahat(listOf(morning, noon), 3_500))
    val zero = morning.copy(warningStart = morning.start)
    assertNull(CountdownSolar.kerahat(listOf(zero), 2_999))
    assertEquals(zero, CountdownSolar.kerahat(listOf(zero), 3_000))
  }

  @Test fun visualAlarmSelectsOnlyTheNextFutureSolarBoundary() {
    assertEquals(2_000L, CountdownSolar.boundary(listOf(morning), 1_999))
    assertEquals(3_000L, CountdownSolar.boundary(listOf(morning), 2_000))
    assertEquals(4_000L, CountdownSolar.boundary(listOf(morning), 3_000))
    assertNull(CountdownSolar.boundary(listOf(morning), 4_000))
    assertNull(CountdownSolar.boundary(emptyList(), 0))
  }
}

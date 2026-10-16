package az.nurvaxt.alarm

import org.junit.Assert.*
import org.junit.Test

class CountdownSolarTest {
  private val morning = CountdownKerahat("Günçıxma", "2026-10-12", 3_000, 4_000)

  @Test fun kerahatCoversItsOwnIntervalAndNeverAnnouncesItInAdvance() {
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
}

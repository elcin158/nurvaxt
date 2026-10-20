package az.nurvaxt.alarm

import org.junit.Assert.*
import org.junit.Test

class CountdownTimelineTest {
  private val prayer = CountdownPrayer("Məğrib", "2026-10-20", "18:30", 11_000, 1_000)
  private fun event(start: Long, end: Long) = CountdownKerahat("Axşam", "2026-10-20", start, end)

  @Test fun currentPositionAndKerahatShareTheActualPrayerInterval() {
    val track = CountdownTimeline.track(prayer, listOf(event(6_000, 10_000)), 8_000)
    assertEquals(0.7f, track.progress!!, 0.0001f)
    assertEquals(listOf(CountdownTrackRange(0.5f, 0.9f)), track.kerahat)
    // The upcoming part of kərahət is still marked, not mistaken for elapsed progress.
    assertEquals(track.kerahat, CountdownTimeline.track(prayer, listOf(event(6_000, 10_000)), 4_000).kerahat)
  }

  @Test fun outOfRangeEventsAreClippedAndOverlappingIntervalsAreMerged() {
    val track = CountdownTimeline.track(prayer, listOf(event(12_000, 13_000), event(-1_000, 2_000),
      event(5_000, 8_000), event(7_000, 9_000), event(9_000, 15_000), event(4_000, 4_000)), 8_000)
    assertEquals(listOf(CountdownTrackRange(0f, 0.1f), CountdownTrackRange(0.4f, 1f)), track.kerahat)
  }

  @Test fun missingOrInvalidPreviousPrayerDoesNotInventProgress() {
    for (previous in listOf(null, prayer.timestamp, prayer.timestamp + 1)) {
      assertEquals(CountdownTrack(null, emptyList()),
        CountdownTimeline.track(prayer.copy(previousTimestamp = previous), listOf(event(6_000, 10_000)), 8_000))
    }
  }

  @Test fun positionStopsAtTheEndsAndIntervalsDoNotBleedIntoAdjacentPrayers() {
    assertEquals(0f, CountdownTimeline.track(prayer, emptyList(), 0).progress!!, 0f)
    assertEquals(1f, CountdownTimeline.track(prayer, emptyList(), 15_000).progress!!, 0f)
    assertTrue(CountdownTimeline.track(prayer, listOf(event(-1_000, 1_000), event(11_000, 12_000)), 5_000).kerahat.isEmpty())
  }
}

package az.nurvaxt.alarm

import org.junit.Assert.*
import org.junit.Test

class CountdownLiveUpdateTest {
  @Test fun WholeIntervalIsPromotedUntilThePrayer() {
    assertTrue(CountdownLiveUpdate.eligible(3600001, true, 6 * 3_600_000, 2_000_000, 0))
    assertTrue(CountdownLiveUpdate.eligible(3600001, true, 1_800_001, 2_000_000, 0))
    assertTrue(CountdownLiveUpdate.eligible(3600001, true, 1, 2_000_000, 0))
    assertFalse(CountdownLiveUpdate.eligible(3600001, true, 0, 2_000_000, 0))
    assertFalse(CountdownLiveUpdate.eligible(3600001, true, -1, 2_000_000, 0))
  }

  @Test fun OldAndroidAndDeniedAccessRetainTheOrdinaryCountdown() {
    assertFalse(CountdownLiveUpdate.eligible(3600000, true, 900_000, 2_000_000, 0))
    assertFalse(CountdownLiveUpdate.eligible(3500000, true, 900_000, 2_000_000, 0))
    assertFalse(CountdownLiveUpdate.eligible(3600001, false, 900_000, 2_000_000, 0))
  }

  @Test fun DismissalSuppressesUpdatesForThatPrayerButNotTheNextPrayer() {
    assertFalse(CountdownLiveUpdate.eligible(3600001, true, 900_000, 2_000_000, 2_000_000))
    assertTrue(CountdownLiveUpdate.eligible(3600001, true, 900_000, 4_000_000, 2_000_000))
  }

  @Test fun IntervalStartsAtThePreviousPrayerOrCoversTheFinalHalfHour() {
    assertEquals(3 * 3_600_000L, CountdownLiveUpdate.interval(1_000, 3 * 3_600_000L + 1_000, 900_000))
    assertEquals(1_800_000L, CountdownLiveUpdate.interval(null, 2_000_000, 900_000))
    assertEquals(2_400_000L, CountdownLiveUpdate.interval(null, 3_000_000, 2_400_000))
    assertEquals(1_800_000L, CountdownLiveUpdate.interval(3_000_000, 2_000_000, 900_000))
  }

  @Test fun SegmentsEndWithTheFinalThirtyAndFifteenMinutes() {
    assertEquals(listOf(9_000, 900, 900), CountdownLiveUpdate.segments(3 * 3_600_000L))
    assertEquals(listOf(0, 900, 900), CountdownLiveUpdate.segments(1_800_000))
    assertEquals(listOf(0, 300, 900), CountdownLiveUpdate.segments(1_200_000))
    assertEquals(listOf(0, 0, 300), CountdownLiveUpdate.segments(300_000))
  }

  @Test fun ProgressCountsElapsedSecondsWithinTheInterval() {
    assertEquals(0, CountdownLiveUpdate.progress(1_800_000, 1_800_001))
    assertEquals(0, CountdownLiveUpdate.progress(1_800_000, 1_800_000))
    assertEquals(900, CountdownLiveUpdate.progress(1_800_000, 900_000))
    assertEquals(10_799, CountdownLiveUpdate.progress(3 * 3_600_000L, 1))
    assertEquals(1_800, CountdownLiveUpdate.progress(1_800_000, 0))
    assertEquals(1_800, CountdownLiveUpdate.progress(1_800_000, -1))
  }
}

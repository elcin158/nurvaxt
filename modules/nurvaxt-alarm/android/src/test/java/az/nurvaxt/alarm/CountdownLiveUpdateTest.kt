package az.nurvaxt.alarm

import org.junit.Assert.*
import org.junit.Test

class CountdownLiveUpdateTest {
  @Test fun imminentWindowHasAnEndAndDoesNotPromoteTheWholeDay() {
    assertFalse(CountdownLiveUpdate.eligible(3600001, true, 1_800_001, 2_000_000, 0))
    assertTrue(CountdownLiveUpdate.eligible(3600001, true, 1_800_000, 2_000_000, 0))
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

  @Test fun ProgressUsesTheSameWindowAndStaysWithinItsBounds() {
    assertEquals(0, CountdownLiveUpdate.progress(1_800_001))
    assertEquals(0, CountdownLiveUpdate.progress(1_800_000))
    assertEquals(50, CountdownLiveUpdate.progress(900_000))
    assertEquals(100, CountdownLiveUpdate.progress(0))
    assertEquals(100, CountdownLiveUpdate.progress(-1))
  }
}

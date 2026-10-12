package az.nurvaxt.alarm

import org.junit.Assert.assertEquals
import org.junit.Test

class CountdownStatusTimeTest {
  @Test fun hoursOmitSecondsWithoutRoundingIntoTheNextMinute() {
    assertEquals("3:36", CountdownStatusTime.text(3 * CountdownStatusTime.HOUR + 36 * 60_000 + 59_999))
    assertEquals("1:00", CountdownStatusTime.text(CountdownStatusTime.HOUR + 999))
  }

  @Test fun switchesToLiveMinuteSecondFormatBelowOneHour() {
    assertEquals("1:00", CountdownStatusTime.text(CountdownStatusTime.HOUR))
    assertEquals("59:59", CountdownStatusTime.text(CountdownStatusTime.HOUR - 1_001))
    assertEquals("36:12", CountdownStatusTime.text(36 * 60_000 + 11_001))
  }

  @Test fun finalSecondsAndExpiredValuesRemainValidDurations() {
    assertEquals("0:01", CountdownStatusTime.text(1))
    assertEquals("0:00", CountdownStatusTime.text(0))
    assertEquals("0:00", CountdownStatusTime.text(-1))
  }
}

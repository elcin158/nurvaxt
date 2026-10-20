package az.nurvaxt.alarm

data class CountdownKerahat(val name: String, val date: String, val start: Long, val end: Long)
data class CountdownKerahatCountdown(val event: CountdownKerahat, val active: Boolean) {
  val target: Long get() = if (active) event.end else event.start
}

/** Absolute verified endpoints supplied by JS; the native service keeps working without JS. */
object CountdownSolar {
  /** The active interval remains available independently of the next prayer. */
  fun kerahat(events: List<CountdownKerahat>, now: Long): CountdownKerahat? =
    events.firstOrNull { now >= it.start && now < it.end }

  /** Show an approaching interval only when it starts by the displayed prayer boundary. */
  fun countdown(events: List<CountdownKerahat>, now: Long, prayerTimestamp: Long): CountdownKerahatCountdown? {
    kerahat(events, now)?.let { return CountdownKerahatCountdown(it, true) }
    val upcoming = events.filter { it.start > now && it.start <= prayerTimestamp && it.end > it.start }
      .minByOrNull { it.start } ?: return null
    return CountdownKerahatCountdown(upcoming, false)
  }

  fun boundary(kerahat: List<CountdownKerahat>, now: Long): Long? =
    kerahat.flatMap { listOf(it.start, it.end) }.filter { it > now }.minOrNull()
}

package az.nurvaxt.alarm

data class CountdownKerahat(
  val name: String, val date: String, val start: Long, val end: Long, val warningStart: Long,
)

/** Absolute verified endpoints supplied by JS; the native service keeps working without JS. */
object CountdownSolar {
  fun kerahat(events: List<CountdownKerahat>, now: Long): CountdownKerahat? =
    events.firstOrNull { now >= it.start && now < it.end }
      ?: events.firstOrNull { now >= it.warningStart && now < it.start }

  fun boundary(kerahat: List<CountdownKerahat>, now: Long): Long? =
    kerahat.flatMap { listOf(it.warningStart, it.start, it.end) }.filter { it > now }.minOrNull()
}

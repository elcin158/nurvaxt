package az.nurvaxt.alarm

data class CountdownKerahat(val name: String, val date: String, val start: Long, val end: Long)

/** Absolute verified endpoints supplied by JS; the native service keeps working without JS. */
object CountdownSolar {
  /** Only a running interval is reported; nothing announces kərahət in advance. */
  fun kerahat(events: List<CountdownKerahat>, now: Long): CountdownKerahat? =
    events.firstOrNull { now >= it.start && now < it.end }

  fun boundary(kerahat: List<CountdownKerahat>, now: Long): Long? =
    kerahat.flatMap { listOf(it.start, it.end) }.filter { it > now }.minOrNull()
}

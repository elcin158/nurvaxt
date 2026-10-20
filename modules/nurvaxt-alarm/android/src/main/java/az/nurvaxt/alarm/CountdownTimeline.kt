package az.nurvaxt.alarm

data class CountdownTrackRange(val start: Float, val end: Float)
data class CountdownTrack(val progress: Float?, val kerahat: List<CountdownTrackRange>)

/** One absolute time scale for elapsed prayer time and real kərahət intervals. */
object CountdownTimeline {
  fun track(prayer: CountdownPrayer, events: List<CountdownKerahat>, now: Long): CountdownTrack {
    // An unknown previous prayer cannot establish a truthful timeline or elapsed fraction.
    val start = prayer.previousTimestamp?.takeIf { it < prayer.timestamp }
      ?: return CountdownTrack(null, emptyList())
    val end = prayer.timestamp
    val span = (end - start).toDouble()
    fun fraction(time: Long) = ((time - start) / span).coerceIn(0.0, 1.0).toFloat()
    val ranges = events.mapNotNull {
      val left = maxOf(start, it.start)
      val right = minOf(end, it.end)
      if (right > left) left to right else null
    }.sortedBy { it.first }
    val merged = mutableListOf<Pair<Long, Long>>()
    for (range in ranges) {
      val previous = merged.lastOrNull()
      if (previous != null && range.first <= previous.second) {
        merged[merged.lastIndex] = previous.first to maxOf(previous.second, range.second)
      } else merged.add(range)
    }
    return CountdownTrack(fraction(now), merged.map { CountdownTrackRange(fraction(it.first), fraction(it.second)) })
  }
}

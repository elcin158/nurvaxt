package az.nurvaxt.alarm

/** Compact status-chip duration: hours/minutes, then minutes/seconds below one hour. */
object CountdownStatusTime {
  const val HOUR = 3_600_000L

  fun text(remaining: Long): String {
    val left = remaining.coerceAtLeast(0)
    val seconds = (left + 999) / 1000
    val first = if (left >= HOUR) left / HOUR else seconds / 60
    val second = if (left >= HOUR) left / 60_000 % 60 else seconds % 60
    return "$first:${second.toString().padStart(2, '0')}"
  }
}

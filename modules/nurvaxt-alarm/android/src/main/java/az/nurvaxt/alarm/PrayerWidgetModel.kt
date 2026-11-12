package az.nurvaxt.alarm

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import kotlin.math.ceil

data class WidgetPrayer(val field: String, val name: String, val time: String, val timestamp: Long)
data class WidgetDay(val date: String, val prayers: List<WidgetPrayer>)
data class WidgetPlan(val location: String, val timeFormat: String, val days: List<WidgetDay>)
data class WidgetSnapshot(
  val date: String,
  val day: WidgetDay?,
  val next: WidgetPrayer?,
  val tomorrow: Boolean,
  val progress: Float?,
)

/** Pure model, always evaluated in the timetable's timezone rather than the phone's timezone. */
object PrayerWidgetModel {
  val fields = listOf("fajr", "dhuhr", "asr", "maghrib", "isha")
  private val zone get() = TimeZone.getTimeZone("Asia/Baku")

  fun date(now: Long): String = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply {
    timeZone = zone
  }.format(now)

  fun shift(date: String, days: Int): String {
    val parser = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { timeZone = zone }
    val calendar = Calendar.getInstance(zone).apply {
      time = parser.parse(date)!!
      add(Calendar.DATE, days)
    }
    return parser.format(calendar.time)
  }

  fun timestamp(date: String, time: String): Long =
    SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.ROOT).apply {
      timeZone = zone
      isLenient = false
    }.parse("$date $time")!!.time

  fun snapshot(plan: WidgetPlan?, now: Long): WidgetSnapshot {
    val today = date(now)
    val day = plan?.days?.find { it.date == today }
    val tomorrow = shift(today, 1)
    // A missing day is unavailable; never silently skip a gap to another published date.
    val next = day?.let {
      plan.days.filter { it.date == today || it.date == tomorrow }
        .flatMap { it.prayers }.filter { it.timestamp > now }.minByOrNull { it.timestamp }
    }
    val yesterday = shift(today, -1)
    val previous = next?.let { prayer ->
      plan!!.days.filter { it.date >= yesterday && it.date <= tomorrow }
        .flatMap { it.prayers }.filter { it.timestamp < prayer.timestamp }.maxByOrNull { it.timestamp }
    }
    val progress = if (next != null && previous != null) {
      ((now - previous.timestamp).toDouble() / (next.timestamp - previous.timestamp)).coerceIn(0.0, 1.0).toFloat()
    } else null
    return WidgetSnapshot(today, day, next, next != null && date(next.timestamp) == tomorrow, progress)
  }

  fun remaining(milliseconds: Long): String {
    val minutes = maxOf(1, ceil(milliseconds.coerceAtLeast(0) / 60_000.0).toLong())
    return if (minutes < 60) "$minutes dəq" else "${minutes / 60} s ${minutes % 60} dəq"
  }

  fun time(time: String, format: String): String {
    if (format == "24") return time
    val hour = time.substringBefore(':').toInt()
    return "${if (hour % 12 == 0) 12 else hour % 12}:${time.substringAfter(':')} ${if (hour < 12) "g.ə." else "g.s."}"
  }

  fun displayDate(now: Long): String = SimpleDateFormat("d MMMM yyyy", Locale.forLanguageTag("az")).apply {
    timeZone = zone
  }.format(now)

  fun nextUpdate(snapshot: WidgetSnapshot, now: Long): Long {
    val midnight = timestamp(shift(snapshot.date, 1), "00:00")
    if (snapshot.next == null) return midnight
    return minOf((now / 60_000 + 1) * 60_000, snapshot.next.timestamp, midnight)
  }
}

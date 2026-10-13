package az.nurvaxt.alarm

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.annotation.RequiresApi

/** Promote the user-enabled countdown to the next prayer for its whole interval. */
object CountdownLiveUpdate {
  private const val SOON = 1_800_000L
  private const val IMMINENT = 900_000L
  const val MIN_SDK_FULL = 3600001
  const val DISMISSED_PRAYER = "dismissedLivePrayer"

  fun eligible(sdkFull: Int, allowed: Boolean, remaining: Long, prayer: Long, dismissed: Long): Boolean =
    sdkFull >= MIN_SDK_FULL && allowed && remaining > 0 && prayer != dismissed

  /** Without a previous prayer the bar covers only the final 30 minutes. */
  fun interval(previous: Long?, prayer: Long, remaining: Long): Long =
    previous?.takeIf { it < prayer }?.let { prayer - it } ?: maxOf(SOON, remaining)

  /** Normal, final-30 and final-15-minute segment lengths in seconds; short intervals drop the earliest. */
  fun segments(interval: Long): List<Int> {
    val total = interval.coerceAtLeast(1_000) / 1000
    val imminent = minOf(total, IMMINENT / 1000)
    val soon = minOf(total - imminent, (SOON - IMMINENT) / 1000)
    return listOf(total - soon - imminent, soon, imminent).map { it.toInt() }
  }

  /** Elapsed seconds on the same scale as [segments]. */
  fun progress(interval: Long, remaining: Long): Int {
    val total = interval.coerceAtLeast(1_000) / 1000
    return (total - (remaining.coerceAtLeast(0) + 999) / 1000).coerceIn(0, total).toInt()
  }

  /** base has common metadata only; custom views must be attached only to the fallback. */
  @RequiresApi(36)
  fun notification(
    context: Context, base: Notification, prayer: Long, previous: Long?, remaining: Long,
  ): Notification {
    val unpin = PendingIntent.getBroadcast(context, 7403,
      Intent(context, CountdownDismissReceiver::class.java).putExtra("prayer", prayer),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = Notification.Builder.recoverBuilder(context, base)
      // The status chip carries the countdown, so the small icon stays the plain app mark.
      .setSmallIcon(CountdownNotification.appIcon(context).toIcon(context))
      .setWhen(prayer).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true)
      .setDeleteIntent(unpin).addAction(Notification.Action.Builder(null, "Canlı nişanı yığ", unpin).build())
    // SystemUI prefers the chronometer but leaves the chip icon-only above one hour, so there the
    // chip shows hours:minutes text refreshed each service minute; the final hour uses the
    // system-rendered minutes:seconds chronometer.
    if (remaining > CountdownStatusTime.HOUR) {
      builder.setUsesChronometer(false).setShowWhen(false)
        // Round up to the whole minute, matching the card text's "1 saat 42 dəq.".
        .setShortCriticalText(CountdownStatusTime.text((remaining + 59_999) / 60_000 * 60_000))
    }
    // Compile with SDK 36; the documented request extra is honored on full SDK 36.1+.
    builder.addExtras(Bundle().apply { putBoolean("android.requestPromotedOngoing", true) })
    val span = interval(previous, prayer, remaining)
    val colors = listOf(R.color.countdown_normal, R.color.countdown_soon, R.color.countdown_imminent)
    val style = Notification.ProgressStyle()
    segments(span).zip(colors).filter { it.first > 0 }.forEach { (length, color) ->
      style.addProgressSegment(Notification.ProgressStyle.Segment(length).setColor(context.getColor(color)))
    }
    return builder.setStyle(style.setProgress(progress(span, remaining))).build()
  }
}

package az.nurvaxt.alarm

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Bundle
import androidx.annotation.RequiresApi

/** Promote only the imminent, user-enabled prayer countdown, never an all-day timetable. */
object CountdownLiveUpdate {
  const val WINDOW = 1_800_000L
  const val MIN_SDK_FULL = 3600001
  const val DISMISSED_PRAYER = "dismissedLivePrayer"

  fun eligible(sdkFull: Int, allowed: Boolean, remaining: Long, prayer: Long, dismissed: Long): Boolean =
    sdkFull >= MIN_SDK_FULL && allowed && remaining in 1..WINDOW && prayer != dismissed

  fun progress(remaining: Long): Int =
    (((WINDOW - remaining).coerceIn(0, WINDOW) * 100) / WINDOW).toInt()

  /** base has common metadata only; custom views must be attached only to the fallback. */
  @RequiresApi(36)
  fun notification(context: Context, base: Notification, prayer: Long, remaining: Long): Notification {
    val unpin = PendingIntent.getBroadcast(context, 7403,
      Intent(context, CountdownDismissReceiver::class.java).putExtra("prayer", prayer),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = Notification.Builder.recoverBuilder(context, base)
      .setWhen(prayer).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true)
      .setDeleteIntent(unpin).addAction(Notification.Action.Builder(null, "Canlı nişanı yığ", unpin).build())
    // Compile with SDK 36; the documented request extra is honored on full SDK 36.1+.
    builder.addExtras(Bundle().apply { putBoolean("android.requestPromotedOngoing", true) })
    val style = Notification.ProgressStyle()
      .addProgressSegment(Notification.ProgressStyle.Segment(50).setColor(context.getColor(R.color.countdown_soon)))
      .addProgressSegment(Notification.ProgressStyle.Segment(50).setColor(context.getColor(R.color.countdown_imminent)))
      .setProgress(progress(remaining))
      .setProgressTrackerIcon(Icon.createWithResource(context, R.drawable.nurvaxt_countdown_clock))
    return builder.setStyle(style).build()
  }
}

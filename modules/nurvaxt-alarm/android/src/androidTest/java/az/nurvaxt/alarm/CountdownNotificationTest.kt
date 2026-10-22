package az.nurvaxt.alarm

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Icon
import android.os.Parcel
import android.os.SystemClock
import android.view.View
import android.widget.Chronometer
import android.widget.ImageView
import android.widget.RemoteViews
import android.widget.TextView
import androidx.core.app.NotificationCompat
import org.junit.Assert.*
import org.junit.Test

class CountdownNotificationTest {
  companion object { lateinit var context: Context }

  private fun base() = NotificationCompat.Builder(context, CountdownState.CHANNEL)
    .setSmallIcon(R.drawable.nurvaxt_countdown_app_mark)
    .setContentTitle("Sübh · 06:45").setContentText("10 dəq. qalıb")
    .setWhen(System.currentTimeMillis() + 600_000)

  private fun roundTrip(notification: Notification): Notification {
    val parcel = Parcel.obtain()
    try {
      notification.writeToParcel(parcel, 0)
      parcel.setDataPosition(0)
      return Notification.CREATOR.createFromParcel(parcel)
    } finally { parcel.recycle() }
  }

  private fun bounds(bitmap: Bitmap, top: Int, bottom: Int) = Rect().apply {
    for (y in top until bottom) for (x in 0 until bitmap.width) {
      if (bitmap.getPixel(x, y).ushr(24) > 128) union(x, y, x + 1, y + 1)
    }
  }

  private fun standard(notification: Notification) {
    val copy = roundTrip(notification)
    assertNull(copy.contentView)
    assertNull(copy.bigContentView)
    assertNull(copy.headsUpContentView)
    assertTrue(copy.extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER))
    assertTrue(copy.extras.getBoolean(Notification.EXTRA_CHRONOMETER_COUNT_DOWN))
    assertEquals("Sübh · 06:45", copy.extras.getString(Notification.EXTRA_TITLE))
    assertEquals("10 dəq. qalıb", copy.extras.getString(Notification.EXTRA_TEXT))
  }

  @Test fun compactAndExpandedInflateAfterParcelingAcrossAllDisplayStates() {
    val now = System.currentTimeMillis()
    for (night in listOf(Configuration.UI_MODE_NIGHT_NO, Configuration.UI_MODE_NIGHT_YES)) {
      val configured = context.createConfigurationContext(Configuration(context.resources.configuration).apply {
        uiMode = uiMode and Configuration.UI_MODE_NIGHT_MASK.inv() or night
      })
      for (left in listOf(10_800_000L, 1_200_000L, 600_000L, 30_000L)) {
        for (phase in listOf("start", "end")) {
          val prayer = CountdownPrayer("Sübh", "2026-10-12", "06:45", now + left, now - 3_600_000, phase)
          for (kerahat in listOf(emptyList(), listOf(CountdownKerahat("Günçıxma", "2026-10-12",
              now + 60_000, now + 300_000)), listOf(CountdownKerahat("Günçıxma", "2026-10-12",
              now - 60_000, now + 300_000)))) {
            val plan = CountdownPlan(true, "Bakı", if (phase == "end") "12" else "24", listOf(prayer), kerahat)
            val notification = roundTrip(CountdownNotification.build(configured, plan, prayer, now))
            assertNotNull(notification.contentView)
            assertNotNull(notification.bigContentView)
            val compact = notification.contentView.apply(configured, null)
            val expanded = notification.bigContentView.apply(configured, null)
            assertTrue(compact.findViewById<Chronometer>(R.id.countdown_timer).isCountDown)
            assertTrue(expanded.findViewById<Chronometer>(R.id.countdown_timer).isCountDown)
            for (content in listOf(compact, expanded)) {
              val progress = content.findViewById<ImageView>(R.id.countdown_progress)
              assertEquals(View.VISIBLE, progress.visibility)
              assertNotNull("Horizontal progress is missing", progress.drawable)
              if (content == compact) {
                assertNull(content.findViewById<View>(R.id.countdown_kerahat))
                assertNull(content.findViewById<View>(R.id.countdown_kerahat_timer))
                continue
              }
              val solar = CountdownSolar.countdown(kerahat, now, prayer.timestamp)
              assertEquals(if (solar == null) View.GONE else View.VISIBLE,
                content.findViewById<View>(R.id.countdown_kerahat).visibility)
              if (solar != null) {
                val timer = content.findViewById<TextView>(R.id.countdown_kerahat_timer)
                assertFalse(timer is Chronometer)
                assertTrue(timer.text.toString().matches(Regex("\\d+")))
                assertEquals(configured.getColor(R.color.countdown_kerahat), timer.currentTextColor)
              }
            }
            assertNull(CountdownState.prefs(context).getString("notificationViewError", null))
          }
        }
      }
    }
  }

  @Test fun missingCompactLayoutFallsBackBeforePosting() {
    standard(CountdownNotification.customOrStandard(context, base()) {
      RemoteViews(context.packageName, 0x7fffffff) to RemoteViews(context.packageName, R.layout.nurvaxt_countdown_expanded)
    })
    assertNotNull(CountdownState.prefs(context).getString("notificationViewError", null))
  }

  @Test fun imsakCountdownUsesTimeLabelsInTheSystemAndCustomNotification() {
    val now = System.currentTimeMillis()
    val imsak = CountdownPrayer("İmsak", "2026-10-09", "05:21", now + 3_600_000, now - 3_600_000)
    val plan = CountdownPlan(true, "Bakı", "24", listOf(imsak))
    val notification = roundTrip(CountdownNotification.build(context, plan, imsak, now))
    assertEquals("İmsak · 05:21", notification.extras.getString(Notification.EXTRA_TITLE))
    assertTrue(notification.extras.getString(Notification.EXTRA_TEXT)!!.contains("İmsaka qalan vaxt"))
    for (views in listOf(notification.contentView, notification.bigContentView)) {
      val content = views.apply(context, null)
      val timer = content.findViewById<Chronometer>(R.id.countdown_timer)
      assertTrue(timer.isCountDown)
      assertTrue(content.findViewById<TextView>(R.id.countdown_prayer).text.toString().startsWith("İmsak"))
      val label = content.findViewById<TextView>(R.id.countdown_prayer).text.toString()
      assertTrue("Prayer time is missing", label.contains("05:21"))
      // Android's Chronometer overrides getContentDescription with its localized duration.
      assertTrue(timer.contentDescription.toString().isNotBlank())
    }
  }

  @Test fun missingExpandedLayoutAlsoFallsBack() {
    standard(CountdownNotification.customOrStandard(context, base()) {
      RemoteViews(context.packageName, R.layout.nurvaxt_countdown_compact) to RemoteViews(context.packageName, 0x7fffffff)
    })
  }

  @Test fun missingNestedLayoutFallsBack() {
    standard(CountdownNotification.customOrStandard(context, base()) {
      RemoteViews(context.packageName, R.layout.nurvaxt_countdown_compact) to
        RemoteViews(context.packageName, R.layout.nurvaxt_countdown_expanded).apply {
          addView(R.id.countdown_kerahat, RemoteViews(context.packageName, 0x7fffffff))
        }
    })
  }

  @Test fun invalidRemoteViewsActionFallsBack() {
    standard(CountdownNotification.customOrStandard(context, base()) {
      RemoteViews(context.packageName, R.layout.nurvaxt_countdown_compact).apply {
        setInt(R.id.countdown_prayer, "methodThatDoesNotExist", 1)
      } to RemoteViews(context.packageName, R.layout.nurvaxt_countdown_expanded)
    })
  }

  @Test fun bothSizesShowPrayerTimeAndOnlyExpandedShowsKerahatTargetInBothFormats() {
    val now = 1_792_497_000_000L
    val prayer = CountdownPrayer("Məğrib", "2026-10-20", "18:30", now + 600_000, now - 3_600_000)
    for (format in listOf("12", "24")) for (active in listOf(false, true)) {
      val kerahat = CountdownKerahat("Axşam", "2026-10-20", now + if (active) -60_000 else 60_000, now + 300_000)
      val plan = CountdownPlan(true, "Bakı", format, listOf(prayer), listOf(kerahat))
      val notification = roundTrip(CountdownNotification.build(context, plan, prayer, now))
      val compact = notification.contentView.apply(context, null)
      val expanded = notification.bigContentView.apply(context, null)
      assertEquals(if (format == "12") "Məğrib · 6:30 PM" else "Məğrib · 18:30",
        compact.findViewById<TextView>(R.id.countdown_prayer).text.toString())
      assertEquals(if (format == "12") "Məğrib · 6:30 PM" else "Məğrib · 18:30",
        expanded.findViewById<TextView>(R.id.countdown_prayer).text.toString())
      assertNull(compact.findViewById<TextView>(R.id.countdown_kerahat_label))
      val target = java.text.SimpleDateFormat(if (format == "12") "h:mm a" else "HH:mm", java.util.Locale.US)
        .apply { timeZone = java.util.TimeZone.getTimeZone("Asia/Baku") }
        .format(java.util.Date(if (active) kerahat.end else kerahat.start))
      assertEquals("Kərahət ${if (active) "bitməsinə" else "girməsinə"} · $target",
        expanded.findViewById<TextView>(R.id.countdown_kerahat_label).text.toString())
    }
  }

  @Test fun kerahatEntryBecomesExitAtStartAndHidesAtEnd() {
    val now = 1_792_497_000_000L
    val prayer = CountdownPrayer("Məğrib", "2026-10-20", "18:30", now + 600_000, now - 3_600_000)
    val event = CountdownKerahat("Günbatımı", "2026-10-20", now + 60_000, now + 180_000)
    val plan = CountdownPlan(true, "Bakı", "24", listOf(prayer), listOf(event))
    for (at in listOf(now, event.start, event.end - 1, event.end)) {
      val notification = roundTrip(CountdownNotification.build(context, plan, prayer, at))
      for (views in listOf(notification.contentView, notification.bigContentView)) {
        val content = views.apply(context, null)
        if (views == notification.contentView) {
          assertNull(content.findViewById<View>(R.id.countdown_kerahat))
          continue
        }
        val visible = at < event.end
        assertEquals(if (visible) View.VISIBLE else View.GONE,
          content.findViewById<View>(R.id.countdown_kerahat).visibility)
        if (visible) {
          val active = at >= event.start
          assertTrue(content.findViewById<TextView>(R.id.countdown_kerahat_label).text.toString()
            .startsWith(if (active) "Kərahət bitməsinə" else "Kərahət girməsinə"))
          val timer = content.findViewById<TextView>(R.id.countdown_kerahat_timer)
          val target = if (active) event.end else event.start
          assertEquals("${(target - at + 59_999) / 60_000}", timer.text.toString())
          assertTrue(notification.extras.getString(Notification.EXTRA_TEXT)!!
            .contains(if (active) "bitməsinə" else "girməsinə"))
        }
      }
    }
  }

  @Test fun kerahatUsesCeilRoundedMinutesEvenInTheLastMinute() {
    val now = System.currentTimeMillis()
    val prayer = CountdownPrayer("Məğrib", "2026-10-21", "18:30", now + 7_200_000, now - 3_600_000)
    for ((left, minutes) in listOf(1L to 1, 30_000L to 1, 60_000L to 1, 60_001L to 2,
        480_000L to 8, 3_700_000L to 62)) for (active in listOf(false, true)) {
      val event = CountdownKerahat("Axşam", "2026-10-21", now + if (active) -60_000 else left,
        now + if (active) left else left + 300_000)
      val notification = roundTrip(CountdownNotification.build(context,
        CountdownPlan(true, "Bakı", "24", listOf(prayer), listOf(event)), prayer, now))
      val expanded = notification.bigContentView.apply(context, null)
      val timer = expanded.findViewById<TextView>(R.id.countdown_kerahat_timer)
      assertFalse(timer is Chronometer)
      assertEquals("$minutes", timer.text.toString())
      assertTrue(timer.contentDescription.toString().contains("$minutes dəqiqə qalıb"))
      assertTrue(notification.extras.getString(Notification.EXTRA_TEXT)!!.endsWith("$minutes dəqiqə"))
    }
  }

  @Test fun nativeChronometersKeepSecondsAndPrayerDigitsRemainNeutral() {
    val now = System.currentTimeMillis()
    for (left in listOf(30_000L, 480_000L, 3_700_000L)) {
      val prayer = CountdownPrayer("Məğrib", "2026-10-20", "18:30", now + left, now - 3_600_000)
      val plan = CountdownPlan(true, "Bakı", "24", listOf(prayer),
        listOf(CountdownKerahat("Axşam", "2026-10-20", now - 60_000, now + 300_000)))
      val notification = roundTrip(CountdownNotification.build(context, plan, prayer, now))
      for (views in listOf(notification.contentView, notification.bigContentView)) {
        val content = views.apply(context, null)
        val timer = content.findViewById<Chronometer>(R.id.countdown_timer)
        assertEquals(left.toDouble(), (timer.base - SystemClock.elapsedRealtime()).toDouble(), 1_000.0)
        assertTrue("Seconds missing: ${timer.text}", timer.text.toString().matches(Regex("\\d+:\\d{2}(:\\d{2})?")))
        assertEquals(content.findViewById<TextView>(R.id.countdown_prayer).currentTextColor, timer.currentTextColor)
      }
    }
  }

  @Test fun glossyTrackKeepsTheRealRedIntervalAndNeutralTailWithOutlinedIndicatorInBothThemes() {
    for (night in listOf(Configuration.UI_MODE_NIGHT_NO, Configuration.UI_MODE_NIGHT_YES)) {
      val configured = context.createConfigurationContext(Configuration(context.resources.configuration).apply {
        uiMode = uiMode and Configuration.UI_MODE_NIGHT_MASK.inv() or night
      })
      val track = CountdownTrack(0.7f, listOf(CountdownTrackRange(0.5f, 0.9f)))
      val bitmap = CountdownNotification.progressTrack(configured, track)
      val y = bitmap.height / 2
      assertEquals(configured.getColor(R.color.countdown_kerahat_track), bitmap.getPixel((bitmap.width * 0.6).toInt(), y))
      assertEquals(configured.getColor(R.color.countdown_kerahat_track), bitmap.getPixel((bitmap.width * 0.8).toInt(), y))
      assertEquals(configured.getColor(R.color.countdown_progress_track), bitmap.getPixel((bitmap.width * 0.95).toInt(), y))
      assertEquals(configured.getColor(R.color.countdown_progress_indicator), bitmap.getPixel((bitmap.width * 0.7).toInt(), y))
      val center = (bitmap.width * 0.7).toInt()
      val density = bitmap.width / 360f
      assertEquals(configured.getColor(R.color.countdown_progress_indicator),
        bitmap.getPixel(center, y + (4.5f * density).toInt()))
      assertEquals(configured.getColor(R.color.countdown_progress_indicator_outline),
        bitmap.getPixel(center, y + (7 * density).toInt()))
      val intervalX = (bitmap.width * 0.6f).toInt()
      assertTrue("Capsule highlight is missing",
        android.graphics.Color.red(bitmap.getPixel(intervalX, y - (3 * density).toInt())) >
          android.graphics.Color.red(bitmap.getPixel(intervalX, y + (3 * density).toInt())))
      val ordinary = CountdownNotification.progressTrack(configured, track.copy(kerahat = emptyList()))
      assertEquals(configured.getColor(R.color.countdown_progress_indicator),
        ordinary.getPixel(center, y + (4.5f * density).toInt()))
      val unknown = CountdownNotification.progressTrack(configured, CountdownTrack(null, emptyList()))
      assertEquals(configured.getColor(R.color.countdown_progress_track),
        unknown.getPixel(center, y))
      assertEquals(0, android.graphics.Color.alpha(unknown.getPixel(center, 0)))
      assertTrue(bitmap.width * bitmap.height * 4 < 384_000)
    }
  }

  @Test fun countdownsAndInlineTimesFitSmallScreensAndLargeSystemFonts() {
    val now = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.ROOT)
      .apply { timeZone = java.util.TimeZone.getTimeZone("Asia/Baku") }.parse("2026-10-20 11:30")!!.time
    val basePrayer = CountdownPrayer("Məğrib", "2026-10-20", "18:30", now + 3_700_000, now - 3_600_000)
    for (prayer in listOf(basePrayer, basePrayer.copy(name = "Sübh", time = "06:45", phase = "end")))
    for (night in listOf(Configuration.UI_MODE_NIGHT_NO, Configuration.UI_MODE_NIGHT_YES)) {
      for (scale in listOf(1f, 2f)) for (widthDp in listOf(260, 320, 390)) for (format in listOf("12", "24"))
      for (active in listOf(false, true)) {
        val configured = context.createConfigurationContext(Configuration(context.resources.configuration).apply {
          uiMode = uiMode and Configuration.UI_MODE_NIGHT_MASK.inv() or night
          fontScale = scale
        })
        val plan = CountdownPlan(true, "Bakı", format, listOf(prayer),
          listOf(CountdownKerahat("Axşam", "2026-10-20", now + if (active) -60_000 else 3_660_000,
            now + if (active) 300_000 else 3_780_000)))
        val notification = roundTrip(CountdownNotification.build(configured, plan, prayer, now))
        for (views in listOf(notification.contentView, notification.bigContentView)) {
          val content = views.apply(configured, null)
          val density = configured.resources.displayMetrics.density
          content.measure(View.MeasureSpec.makeMeasureSpec((widthDp * density).toInt(), View.MeasureSpec.EXACTLY),
            if (views == notification.contentView) View.MeasureSpec.makeMeasureSpec((48 * density).toInt(), View.MeasureSpec.EXACTLY)
            else View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
          content.layout(0, 0, content.measuredWidth, content.measuredHeight)
          val matrix = FloatArray(9)
          content.findViewById<ImageView>(R.id.countdown_progress).imageMatrix.getValues(matrix)
          assertEquals("Position marker is stretched at width=$widthDp",
            matrix[android.graphics.Matrix.MSCALE_X], matrix[android.graphics.Matrix.MSCALE_Y], 0.001f)
          for (id in listOf(R.id.countdown_prayer, R.id.countdown_timer,
              R.id.countdown_kerahat_label, R.id.countdown_kerahat_timer)) {
            val text = content.findViewById<TextView>(id) ?: continue
            val message = "Clipped ${text.text}: width=$widthDp scale=$scale format=$format compact=${views == notification.contentView}, " +
              "box=${text.width}x${text.height} textSize=${text.textSize} layoutHeight=${text.layout.height}"
            assertTrue(message, text.width > 0 && text.height > 0)
            if (id == R.id.countdown_kerahat_label) assertEquals(message, 1, text.layout.lineCount)
            assertTrue(message, text.layout.height <= text.height - text.compoundPaddingTop - text.compoundPaddingBottom)
            for (line in 0 until text.layout.lineCount) {
              assertEquals(message, 0, text.layout.getEllipsisCount(line))
              // Wrapped trailing spaces can extend beyond the line; check the visible text advance.
              assertTrue(message, text.layout.getLineMax(line) <= text.width - text.compoundPaddingLeft - text.compoundPaddingRight + 1)
            }
          }
        }
      }
    }
  }

  /** Isolated instrumentation-package preview, without modifying app data or the device clock. */
  fun preview(showKerahat: Boolean, upcomingKerahat: Boolean = false) {
    val now = System.currentTimeMillis()
    val target = (now / 60_000 + 8) * 60_000
    val time = java.text.SimpleDateFormat("HH:mm", java.util.Locale.ROOT)
      .apply { timeZone = java.util.TimeZone.getTimeZone("Asia/Baku") }.format(java.util.Date(target))
    val prayer = CountdownPrayer("Nümunə", "2026-10-20", time,
      target, target - 1_500_000)
    val plan = CountdownPlan(true, "Bakı", "24", listOf(prayer), if (showKerahat)
      listOf(CountdownKerahat("Axşam", "2026-10-20",
        if (upcomingKerahat) now + 90_000 else target - 780_000, target - 170_000)) else emptyList())
    // The preview has no live foreground-service/group owner, unlike the application.
    val previewDeadline = if (showKerahat) {
      if (upcomingKerahat) now + 90_000 else target - 170_000
    } else now + 300_000
    val notification = Notification.Builder.recoverBuilder(context,
      CountdownNotification.build(context, plan, prayer, now)).setGroup(null)
      .setSubText("Nümunə vaxtlar").setTimeoutAfter(minOf(300_000L, previewDeadline - now)).build()
    (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(7490, notification)
  }

  @Test fun startupUsesAppBitmapAndNoCustomLayouts() {
    val notification = roundTrip(CountdownNotification.startup(context))
    assertEquals(Icon.TYPE_BITMAP, notification.smallIcon.type)
    val mark = (notification.smallIcon.loadDrawable(context) as BitmapDrawable).bitmap
    val source = requireNotNull(BitmapFactory.decodeResource(context.resources, R.drawable.nurvaxt_countdown_app_mark))
    assertEquals(96, mark.width)
    assertEquals(96, mark.height)
    val original = bounds(source, 0, source.height)
    val enlarged = bounds(mark, 0, mark.height)
    // The mark is scaled until its longer axis touches the bitmap's edges; alpha bounds can round
    // at both edges when the bitmap is filtered.
    val scale = 96.0 / maxOf(original.width(), original.height())
    assertEquals("Standalone wordmark width", original.width() * scale, enlarged.width().toDouble(), 2.0)
    assertEquals("Standalone wordmark height", original.height() * scale, enlarged.height().toDouble(), 2.0)
    assertTrue("Standalone wordmark leaves the slot unused",
      enlarged.width() >= 95 || enlarged.height() >= 95)
    assertEquals(48f, enlarged.exactCenterX(), 1f)
    assertEquals(48f, enlarged.exactCenterY(), 1f)
    assertTrue("Standalone wordmark is clipped", enlarged.left >= 0 && enlarged.right <= 96 &&
      enlarged.top >= 0 && enlarged.bottom <= 96)
    assertNull(notification.contentView)
    assertNull(notification.bigContentView)
  }

  @Test fun statusIconStacksWordmarkAboveTimeAndPreservesDurationBoundaries() {
    val now = System.currentTimeMillis()
    fun icon(left: Long) = CountdownPrayer("Sübh", "2026-10-12", "06:45", now + left, null).let { prayer ->
      val notification = CountdownNotification.build(context, CountdownPlan(true, "Bakı", "24", listOf(prayer)), prayer, now)
      (notification.smallIcon.loadDrawable(context) as BitmapDrawable).bitmap
    }
    val stackedMark = icon(40 * 60_000L)
    val artwork = bounds(stackedMark, 0, 48)
    assertFalse("Wordmark is missing above the time", artwork.isEmpty)
    assertTrue("Wordmark overlaps the time", artwork.bottom <= 48)
    assertTrue("Wordmark leaves its row unused", artwork.height() >= 42)
    assertEquals(48f, artwork.exactCenterX(), 2f)
    for (left in listOf(1_000L, 30_000L, 59_000L, 59_999L, 60_000L, 120_000L,
        40 * 60_000L, 59 * 60_000L, 3_599_999L)) {
      val count = icon(left)
      assertEquals(96, count.width)
      assertEquals(96, count.height)
      val number = bounds(count, 48, 96)
      assertTrue("Duration is too small: $left", number.height() >= 36)
      assertEquals(48f, number.exactCenterX(), 2f)
      assertEquals(72f, number.exactCenterY(), 2f)
      assertTrue("Duration is clipped: $left ${number.toShortString()}", number.left >= 2 && number.right <= 94)
      assertTrue("Duration overlaps the wordmark: $left", number.top >= 50 && number.bottom <= 94)
      for (y in 0 until 48) for (x in 0 until 96) {
        assertEquals("Wordmark changed with duration: $left", stackedMark.getPixel(x, y), count.getPixel(x, y))
      }
    }
    assertTrue(icon(59_000).sameAs(icon(59 * 60_000L)))
    assertTrue(icon(60_000).sameAs(icon(1_000)))
    assertTrue(icon(60_001).sameAs(icon(2 * 60_000L)))
    assertFalse(icon(59_999).sameAs(icon(60_000)))
    assertTrue(icon(1_001).sameAs(icon(2_000)))
    assertTrue(icon(0).sameAs(icon(1_000)))
    assertFalse(icon(40 * 60_000L).sameAs(icon(39 * 60_000L)))
    val mark = (CountdownNotification.appIcon(context).toIcon(context).loadDrawable(context) as BitmapDrawable).bitmap
    for (left in listOf(3_600_000L, 3_600_001L, 99 * 60_000L, 180 * 60_000L, 24 * 3_600_000L)) {
      assertTrue("Expected only the app icon: $left", icon(left).sameAs(mark))
    }
    assertFalse(icon(3_599_999L).sameAs(mark))
  }
}

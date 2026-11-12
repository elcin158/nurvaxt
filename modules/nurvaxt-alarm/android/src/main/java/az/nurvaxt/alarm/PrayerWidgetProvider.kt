package az.nurvaxt.alarm

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import java.util.concurrent.Executors

/** A short native update; React Native is never started by the launcher or a timer. */
internal object PrayerWidgetUpdater {
  private val executor = Executors.newSingleThreadExecutor()
  fun enqueue(context: Context, pending: BroadcastReceiver.PendingResult) {
    executor.execute {
      try {
        PrayerWidgetState.update(context.applicationContext)
      } catch (error: Exception) {
        Log.e("NurvaxtWidget", "Widget refresh failed", error)
      } finally {
        pending.finish()
      }
    }
  }
}

open class PrayerWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    PrayerWidgetUpdater.enqueue(context, goAsync())
  }
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
    PrayerWidgetUpdater.enqueue(context, goAsync())
  }
  override fun onDeleted(context: Context, ids: IntArray) {
    PrayerWidgetUpdater.enqueue(context, goAsync())
  }
  override fun onDisabled(context: Context) {
    PrayerWidgetUpdater.enqueue(context, goAsync())
  }
}

class LargePrayerWidget : PrayerWidgetProvider()
class CompactPrayerWidget : PrayerWidgetProvider()
class SmallPrayerWidget : PrayerWidgetProvider()

class PrayerWidgetRefreshReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    PrayerWidgetUpdater.enqueue(context, goAsync())
  }
}

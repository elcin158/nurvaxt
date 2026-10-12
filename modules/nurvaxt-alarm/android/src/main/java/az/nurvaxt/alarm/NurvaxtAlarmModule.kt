package az.nurvaxt.alarm

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

class NurvaxtAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NurvaxtAlarm")
    AsyncFunction("replacePlan") { json: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("Context unavailable")
      AlarmQueue.replace(context, JSONArray(json))
    }
    AsyncFunction("replaceCountdownPlan") { json: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("Context unavailable")
      CountdownState.replace(context, JSONObject(json))
    }
    AsyncFunction("scheduleTest") {
      AlarmQueue.scheduleTest(appContext.reactContext ?: throw IllegalStateException("Context unavailable"))
    }
    Function("diagnostics") {
      AlarmQueue.diagnostics(appContext.reactContext ?: throw IllegalStateException("Context unavailable"))
    }
    Function("requestExactAccess") {
      val context = appContext.reactContext ?: throw IllegalStateException("Context unavailable")
      if (android.os.Build.VERSION.SDK_INT >= 31 && !AlarmQueue.exact(context)) {
        context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
    Function("liveNotificationAccess") {
      LiveNotificationAccess.status(appContext.reactContext ?: throw IllegalStateException("Context unavailable"))
    }
    Function("openLiveNotificationSettings") {
      LiveNotificationAccess.openSettings(appContext.reactContext ?: throw IllegalStateException("Context unavailable"))
    }
  }
}

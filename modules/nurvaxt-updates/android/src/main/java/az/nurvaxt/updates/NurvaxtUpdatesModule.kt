package az.nurvaxt.updates

import android.app.Activity
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NurvaxtUpdatesModule : Module() {
  private var manager: AppUpdateManager? = null
  private var versionCode = 0
  private var flexibleAllowed = false
  private var starting = false
  private var destroyed = false

  private val listener = InstallStateUpdatedListener { state ->
    if (!destroyed) {
      sendEvent("onStateChange", snapshot(
        state.installStatus(), state.bytesDownloaded(), state.totalBytesToDownload()
      ))
    }
  }

  override fun definition() = ModuleDefinition {
    Name("NurvaxtUpdates")
    Events("onStateChange")

    AsyncFunction("checkForUpdate") { promise: Promise ->
      updateManager().appUpdateInfo
        .addOnSuccessListener { info -> promise.resolve(readInfo(info)) }
        .addOnFailureListener { error -> promise.reject("ERR_UPDATE_CHECK", "Update check failed", error) }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("startUpdate") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null || activity.isFinishing || activity.isDestroyed) {
        promise.reject("ERR_UPDATE_ACTIVITY", "No foreground activity", null)
        return@AsyncFunction
      }
      if (starting) {
        promise.reject("ERR_UPDATE_BUSY", "An update prompt is already open", null)
        return@AsyncFunction
      }
      starting = true
      val updates = updateManager()
      // A fresh AppUpdateInfo must be requested for every attempt, including retries.
      updates.appUpdateInfo.addOnSuccessListener { info ->
        val state = readInfo(info)
        if (!destroyed) sendEvent("onStateChange", state)
        if (info.installStatus() == InstallStatus.DOWNLOADED) {
          starting = false
          promise.resolve("downloaded")
        } else if (info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE ||
          !info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
          starting = false
          promise.resolve("unavailable")
        } else {
          // This task-based API works with Expo's activity without a custom result handler.
          try {
            val foreground = appContext.currentActivity
            if (destroyed || foreground == null || foreground.isFinishing || foreground.isDestroyed) {
              starting = false
              promise.reject("ERR_UPDATE_ACTIVITY", "No foreground activity", null)
            } else {
              updates.startUpdateFlow(info, foreground, AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build())
                .addOnSuccessListener { result ->
                  starting = false
                  when (result) {
                    Activity.RESULT_OK -> promise.resolve("accepted")
                    Activity.RESULT_CANCELED -> promise.resolve("cancelled")
                    else -> promise.reject("ERR_UPDATE_FLOW", "Update prompt failed", null)
                  }
                }
                .addOnFailureListener { error ->
                  starting = false
                  promise.reject("ERR_UPDATE_FLOW", "Update prompt failed", error)
                }
            }
          } catch (error: Exception) {
            starting = false
            promise.reject("ERR_UPDATE_FLOW", "Update prompt failed", error)
          }
        }
      }.addOnFailureListener { error ->
        starting = false
        promise.reject("ERR_UPDATE_CHECK", "Update check failed", error)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("completeUpdate") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null || activity.isFinishing || activity.isDestroyed) {
        promise.reject("ERR_UPDATE_ACTIVITY", "No foreground activity", null)
        return@AsyncFunction
      }
      val updates = updateManager()
      updates.appUpdateInfo.addOnSuccessListener { info ->
        if (info.installStatus() != InstallStatus.DOWNLOADED) {
          promise.reject("ERR_UPDATE_NOT_READY", "Update has not been downloaded", null)
        } else {
          updates.completeUpdate()
            .addOnSuccessListener { promise.resolve() }
            .addOnFailureListener { error -> promise.reject("ERR_UPDATE_INSTALL", "Update installation failed", error) }
        }
      }.addOnFailureListener { error -> promise.reject("ERR_UPDATE_CHECK", "Update check failed", error) }
    }.runOnQueue(Queues.MAIN)

    OnDestroy {
      destroyed = true
      manager?.unregisterListener(listener)
      manager = null
    }
  }

  private fun updateManager(): AppUpdateManager {
    return manager ?: AppUpdateManagerFactory.create(
      appContext.reactContext ?: throw IllegalStateException("Context unavailable")
    ).also {
      manager = it
      it.registerListener(listener)
    }
  }

  private fun readInfo(info: AppUpdateInfo): Map<String, Any> {
    versionCode = info.availableVersionCode()
    flexibleAllowed = info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
    return snapshot(info.installStatus(), info.bytesDownloaded(), info.totalBytesToDownload(),
      info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE)
  }

  private fun snapshot(status: Int, bytes: Long, total: Long, available: Boolean = versionCode > 0): Map<String, Any> {
    val phase = when (status) {
      InstallStatus.PENDING -> "pending"
      InstallStatus.DOWNLOADING -> "downloading"
      InstallStatus.DOWNLOADED -> "downloaded"
      InstallStatus.INSTALLING -> "installing"
      InstallStatus.INSTALLED -> "installed"
      InstallStatus.FAILED -> "failed"
      InstallStatus.CANCELED -> "cancelled"
      else -> if (available && flexibleAllowed) "available" else "unavailable"
    }
    return mapOf(
      "status" to phase,
      "versionCode" to versionCode,
      "flexibleAllowed" to flexibleAllowed,
      "bytesDownloaded" to bytes.toDouble(),
      "totalBytes" to total.toDouble()
    )
  }
}

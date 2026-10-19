package az.nurvaxt.alarm

import android.app.Activity
import android.app.Instrumentation
import android.os.Bundle
import org.junit.runner.JUnitCore
import org.junit.runner.Description
import org.junit.runner.notification.Failure
import org.junit.runner.notification.RunListener

/** Uses the platform instrumentation API and existing JUnit dependency. */
class CountdownTestRunner : Instrumentation() {
  private var testClass: Class<*> = CountdownNotificationTest::class.java
  private var preview = false

  override fun onCreate(arguments: Bundle?) {
    super.onCreate(arguments)
    preview = arguments?.getString("preview") == "reminders"
    if (arguments?.getString("class") == SystemSoundPreviewTest::class.java.name) {
      testClass = SystemSoundPreviewTest::class.java
    }
    if (arguments?.getString("class") == ReminderNotificationTest::class.java.name) {
      testClass = ReminderNotificationTest::class.java
    }
    if (arguments?.getString("class") == CountdownDismissalTest::class.java.name) {
      testClass = CountdownDismissalTest::class.java
    }
    start()
  }

  override fun onStart() {
    CountdownNotificationTest.context = targetContext
    SystemSoundPreviewTest.context = targetContext
    ReminderNotificationTest.context = targetContext
    CountdownDismissalTest.context = targetContext
    if (preview) {
      ReminderNotificationTest().preview()
      finish(Activity.RESULT_OK, Bundle().apply { putString("stream", "Combined reminder preview posted") })
      return
    }
    val junit = JUnitCore()
    var current = 0
    var failed = false
    fun status(description: Description) = Bundle().apply {
      putString("class", description.className)
      putString("test", description.methodName)
      putInt("current", current)
      putInt("numtests", testClass.declaredMethods.count { it.getAnnotation(org.junit.Test::class.java) != null })
    }
    junit.addListener(object : RunListener() {
      override fun testStarted(description: Description) {
        current++
        failed = false
        sendStatus(1, status(description))
      }
      override fun testFailure(failure: Failure) {
        failed = true
        sendStatus(-2, status(failure.description).apply { putString("stack", failure.trace) })
      }
      override fun testFinished(description: Description) {
        if (!failed) sendStatus(0, status(description))
      }
    })
    var summary = ""
    var success = false
    val runTests = {
      val result = junit.run(testClass)
      success = result.wasSuccessful()
      summary = "${result.runCount} tests, ${result.failureCount} failures"
    }
    // Sound timeout checks leave the main looper free to process native cleanup.
    if (testClass == CountdownNotificationTest::class.java) runOnMainSync { runTests() } else runTests()
    finish(if (success) Activity.RESULT_OK else Activity.RESULT_CANCELED, Bundle().apply {
      putString("stream", summary)
    })
  }
}

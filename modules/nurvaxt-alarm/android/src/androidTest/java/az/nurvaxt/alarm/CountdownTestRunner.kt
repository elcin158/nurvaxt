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
  override fun onCreate(arguments: Bundle?) {
    super.onCreate(arguments)
    start()
  }

  override fun onStart() {
    CountdownNotificationTest.context = targetContext
    val junit = JUnitCore()
    var current = 0
    var failed = false
    fun status(description: Description) = Bundle().apply {
      putString("class", description.className)
      putString("test", description.methodName)
      putInt("current", current)
      putInt("numtests", 7)
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
    runOnMainSync {
      val result = junit.run(CountdownNotificationTest::class.java)
      success = result.wasSuccessful()
      summary = "${result.runCount} tests, ${result.failureCount} failures"
    }
    finish(if (success) Activity.RESULT_OK else Activity.RESULT_CANCELED, Bundle().apply {
      putString("stream", summary)
    })
  }
}

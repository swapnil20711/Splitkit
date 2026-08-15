package expo.modules.splitkit

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Context
import android.provider.Settings
import java.util.UUID

class SplitkitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Splitkit")

    Function("getDeviceId") {
      val context = appContext.reactContext ?: return@Function UUID.randomUUID().toString()

      val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
      if (!androidId.isNullOrEmpty() && androidId!=="9774d56d682e549c") {
        return@Function androidId
      }

      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.getString(DEVICE_ID_KEY, null) ?: UUID.randomUUID().toString().also {
        prefs.edit().putString(DEVICE_ID_KEY, it).apply()
      }
    }
  }

  companion object {
    private const val PREFS_NAME = "splitkit"
    private const val DEVICE_ID_KEY = "splitkit_persistent_device_id"
  }
}

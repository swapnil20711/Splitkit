package expo.modules.splitkit

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SplitkitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Splitkit")

    Function("hello") {
      "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { value: String ->
    }
  }
}

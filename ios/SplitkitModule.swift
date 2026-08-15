import ExpoModulesCore

public class SplitkitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Splitkit")

    Function("hello") {
      return "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { (value: String) in
    }
  }
}

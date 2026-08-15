import ExpoModulesCore

public class SplitkitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Splitkit")

    Function("getDeviceId") { ()-> String in
        if let vendorId = UIDevice.current.identifierForVendor?.uuidString {
            return vendorId
        }
        
        let key = "splitkit_persistent_device_id"
        if let storedId = UserDefaults.standard.string(forKey: key) {
            return storedId
        }
        
        let newId = UUID().uuidString
        UserDefaults.standard.set(newId, forKey: key)
        return newId
    }
  }
}

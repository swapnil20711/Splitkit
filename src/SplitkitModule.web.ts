import { registerWebModule, NativeModule } from 'expo';

const DEVICE_ID_KEY = 'splitkit_persistent_device_id';

class SplitkitModule extends NativeModule<{}> {
  getDeviceId(): string {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      return stored;
    }

    const newId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  }
}

export default registerWebModule(SplitkitModule, 'SplitkitModule');

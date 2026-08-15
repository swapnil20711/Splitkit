import { NativeModule, requireNativeModule } from 'expo';

declare class SplitkitModule extends NativeModule<{}> {
  getDeviceId(): string;
}

export default requireNativeModule<SplitkitModule>('Splitkit');

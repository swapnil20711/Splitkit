import { NativeModule, requireNativeModule } from 'expo';

declare class SplitkitModule extends NativeModule<{}> {
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<SplitkitModule>('Splitkit');

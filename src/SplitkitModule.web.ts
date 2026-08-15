import { registerWebModule, NativeModule } from 'expo';

class SplitkitModule extends NativeModule<{}> {
  hello() {
    return 'Hello world! 👋';
  }

  async setValueAsync(value: string): Promise<void> {}
}

export default registerWebModule(SplitkitModule, 'SplitkitModule');

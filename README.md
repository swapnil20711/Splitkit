# splitkit

Deterministic A/B testing and feature flagging for **Expo** & **React Native** — no backend, no network calls, no SDK keys.

Splitkit buckets users locally using a MurmurHash3 hash of `userId:experimentKey`. The same user always lands in the same variant, on every launch and on every device that reports the same ID, without ever asking a server.

- **Deterministic** — pure hash-based bucketing, no randomness, no persisted assignment state.
- **Offline-first** — assignments resolve synchronously at render time. Works on a plane.
- **Zero runtime dependencies** — the whole engine is a hash function and a weighted range check.
- **Native device IDs** — iOS `identifierForVendor`, Android `ANDROID_ID`, `localStorage` UUID on web.
- **Typed payloads** — attach arbitrary config to each variant and get it back type-safe.
- **Exposure tracking** — deduplicated callbacks you can wire to any analytics tool.

---

## Installation

```bash
npx expo install @swapnil_codes/splitkit
```

Then rebuild your native project (this is a native module, so Expo Go won't pick it up):

```bash
npx expo prebuild
npx expo run:ios     # or: npx expo run:android
```

Supported platforms: iOS, Android, and Web.

---

## Quick start

Wrap your app in a provider, declare your experiments, and read the assigned variant with a hook.

```tsx
// App.tsx
import { SplitKitTestingProvider, getDeviceId } from '@swapnil_codes/splitkit';
import OnboardingScreen from './OnboardingScreen';

const EXPERIMENTS = {
  onboarding_v2: {
    key: 'onboarding_v2',
    variants: [
      { name: 'video_intro', weight: 0.5, payload: { title: 'Watch Intro Video' } },
      { name: 'quick_swipe', weight: 0.5, payload: { title: '3-Step Swipe Walkthrough' } },
    ],
    fallback: 'video_intro',
  },
};

export default function App() {
  return (
    <SplitKitTestingProvider
      user={{ id: getDeviceId() }}
      experiments={EXPERIMENTS}
      onExposure={(event) => {
        analytics.track('experiment_exposure', event);
      }}>
      <OnboardingScreen />
    </SplitKitTestingProvider>
  );
}
```

```tsx
// OnboardingScreen.tsx
import { useExperiment } from '@swapnil_codes/splitkit';

type Payload = { title: string };

export default function OnboardingScreen() {
  const { variant, payload } = useExperiment<Payload>('onboarding_v2');

  if (variant === 'quick_swipe') {
    return <SwipeWalkthrough title={payload?.title} />;
  }
  return <VideoIntro title={payload?.title} />;
}
```

---

## API

### `<SplitKitTestingProvider />`

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `user` | `UserContext` | yes | The subject being bucketed. If `user.id` is falsy, the native device ID is used instead. |
| `experiments` | `Record<string, Experiment>` | yes | Experiment config, keyed by experiment key. |
| `onExposure` | `ExposureCallback` | no | Fired the first time a user is exposed to a given experiment/variant pair. |
| `children` | `ReactNode` | yes | |

### `useExperiment<T>(experimentKey, fallbackVariant?)`

Returns `{ variant: string; payload?: T; deviceId: string }`.

```tsx
const { variant, payload, deviceId } = useExperiment<MyPayload>('checkout_button', 'control');
```

- `fallbackVariant` defaults to `'control'` and is only used when the hook is called outside a provider or the key isn't in `experiments`.
- Calling the hook logs an exposure (once per `userId:experimentKey:variant`) via `onExposure`.
- Used outside a provider it degrades gracefully: returns the fallback variant and an empty `deviceId` rather than throwing.

### `getDeviceId(): string`

Synchronously returns a stable per-install device identifier.

| Platform | Source |
| --- | --- |
| iOS | `UIDevice.identifierForVendor`, falling back to a UUID in `UserDefaults` |
| Android | `Settings.Secure.ANDROID_ID`, falling back to a UUID in `SharedPreferences` |
| Web | UUID stored in `localStorage` |

### `evaluateExperiment<T>(experiment, user)`

The pure bucketing function behind the hook — useful in tests, scripts, or non-React code.

```ts
import { evaluateExperiment } from '@swapnil_codes/splitkit';

evaluateExperiment(EXPERIMENTS.onboarding_v2, { id: 'user-123' });
// => { variant: 'quick_swipe', payload: { title: '3-Step Swipe Walkthrough' } }
```

### `murmur3_32(key, seed?)` / `getBucketScore(userId, experimentKey)`

The hashing primitives are exported too. `getBucketScore` returns a stable float in `[0, 1)` for a user/experiment pair — handy for verifying your split distribution offline.

```ts
getBucketScore('user-123', 'onboarding_v2'); // => 0.7213…
```

---

## Types

```ts
interface Variant<T = any> {
  name: string;
  weight: number;          // 0.0–1.0; weights should sum to 1.0 per experiment
  payload?: T;
}

interface Experiment<T = any> {
  key: string;
  variants: Variant<T>[];
  fallback: string;                                        // variant name used when disabled/untargeted
  enabled?: boolean;                                       // set false to force the fallback
  targetingRules?: (attributes: Record<string, any>) => boolean;
}

interface UserContext {
  id: string;
  attributes?: Record<string, any>;
}

type ExposureCallback = (event: {
  experimentKey: string;
  variant: string;
  userId: string;
  timestamp: number;
}) => void;
```

---

## How bucketing works

1. Compute `murmur3_32("<userId>:<experimentKey>")` and normalize it to a score in `[0, 1)`.
2. Walk the `variants` array, accumulating `weight`.
3. The first variant whose cumulative weight exceeds the score wins.

Consequences worth knowing:

- **Assignments are stable** as long as `userId` and `key` don't change. Nothing is persisted, so there's no cache to invalidate.
- **Order matters.** Reordering `variants` reshuffles who lands where. Append new variants at the end when you can.
- **Changing `key` reshuffles everyone.** That's the mechanism for a clean re-randomization.
- **Weights should sum to 1.0.** If they sum to less, users above the total fall through to `fallback`.
- **Each experiment is independent** because the key is part of the hash input — a user in `variant_a` of one test isn't biased toward any variant of another.

---

## Feature flags

A flag is just a two-variant experiment. Use `enabled` or `targetingRules` for hard gating.

```ts
const EXPERIMENTS = {
  new_checkout: {
    key: 'new_checkout',
    variants: [
      { name: 'off', weight: 0.9 },
      { name: 'on', weight: 0.1 },   // 10% rollout
    ],
    fallback: 'off',
    targetingRules: (attrs) => attrs.plan === 'pro',
  },
};
```

Users who fail `targetingRules` — or any experiment with `enabled: false` — receive `fallback` and are never bucketed.

---

## Exposure tracking

`onExposure` fires once per unique `userId:experimentKey:variant` for the lifetime of the provider, so you can point it straight at an analytics sink without worrying about duplicate events on re-render.

```tsx
<SplitKitTestingProvider
  user={{ id: userId }}
  experiments={EXPERIMENTS}
  onExposure={({ experimentKey, variant, userId, timestamp }) => {
    amplitude.track('$exposure', { experiment: experimentKey, variant, userId, timestamp });
  }}>
```

Dedupe state lives in a ref, so it resets when the provider unmounts (typically an app restart).

---

## Example app

A runnable Expo app lives in [`example/`](./example):

```bash
cd example
npm install
npx expo run:ios     # or: npx expo run:android
```

It renders the resolved device ID, the assigned variant, and the variant payload for an `onboarding_v2` experiment.

---

## Development

```bash
npm run build     # compile src/ to build/
npm run clean
npm run lint
npm test
npm run open:ios      # open the example iOS project in Xcode
npm run open:android  # open the example Android project in Android Studio
```

---

## Contributing

Issues and PRs welcome at [github.com/swapnil20711/splitkit](https://github.com/swapnil20711/splitkit).

## License

MIT © [swapnil20711](https://github.com/swapnil20711)

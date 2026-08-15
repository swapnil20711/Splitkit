import { getDeviceId, SplitKitTestingProvider } from 'splitkit';
import { SafeAreaView, Text, View } from 'react-native';
import OnboardingScreen from './OnboardingScreen';

export default function App() {
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

  return (
    <SafeAreaView style={styles.container}>
      <SplitKitTestingProvider user={{ id: getDeviceId() }} experiments={EXPERIMENTS} onExposure={(event) => {
        console.log(`[Tracking] Device ${event.userId} exposed to
  ${event.experimentKey} -> ${event.variant}`);
      }}>
        <OnboardingScreen />
      </SplitKitTestingProvider>
    </SafeAreaView>
  );
}

function Group(props: { name: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeader}>{props.name}</Text>
      {props.children}
    </View>
  );
}

const styles = {
  header: { fontSize: 30, margin: 20 },
  groupHeader: { fontSize: 20, marginBottom: 20 },
  group: { margin: 20, backgroundColor: '#fff', borderRadius: 10, padding: 20 },
  container: { flex: 1, backgroundColor: '#eee' },
  view: { flex: 1, height: 200 },
};

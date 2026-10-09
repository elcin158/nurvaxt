import { Redirect } from 'expo-router';
import { usePreferences } from '../src/store/preferences';
export default function Index() {
  const complete = usePreferences((s) => s.onboardingComplete);
  return <Redirect href={complete ? '/(tabs)' : '/onboarding'} />;
}

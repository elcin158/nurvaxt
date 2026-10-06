import { Stack } from 'expo-router';
import App, { useAuth } from '../../App';
function Routes() {
  const { authenticated } = useAuth();
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!authenticated}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={authenticated}>
      <Stack.Screen name="index" /><Stack.Screen name="profile" /><Stack.Screen name="temporary-residents" />
    </Stack.Protected>
  </Stack>;
}
export default function Layout() { return <App><Routes /></App>; }

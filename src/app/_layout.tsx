import { useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import App, { useAuth } from '../../App';
import { HouseholdProvider } from '../households/context';
import { NotificationProvider } from '../notifications/context';
import { ReferenceProvider } from '../reference/context';
import { ResidentProvider } from '../temporary-residents/context';
function Routes() {
  const { authenticated } = useAuth(), pathname = usePathname();
  // A module opens its encrypted store on its first visit and keeps it until sign-out, so switching
  // modules does not decrypt the records and the multi-megabyte catalogue again.
  const [opened, setOpened] = useState({ households: false, residents: false });
  const next = authenticated ? {
    households: opened.households || pathname.startsWith('/households'),
    residents: opened.residents || pathname.startsWith('/temporary-residents'),
  } : { households: false, residents: false };
  if (next.households !== opened.households || next.residents !== opened.residents) setOpened(next);
  return <ReferenceProvider><NotificationProvider><HouseholdProvider enabled={next.households}><ResidentProvider enabled={next.residents}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!authenticated}><Stack.Screen name="login" /></Stack.Protected>
      <Stack.Protected guard={authenticated}>
        <Stack.Screen name="index" /><Stack.Screen name="profile" /><Stack.Screen name="reference" /><Stack.Screen name="notifications" />
        {/* The modules are switched with a replace from ModuleTabs; the default Android transition
            slid the whole screen up, so the swap happens in place like a tab. */}
        <Stack.Screen name="households" options={{ animation: 'none' }} /><Stack.Screen name="temporary-residents" options={{ animation: 'none' }} />
      </Stack.Protected>
    </Stack>
  </ResidentProvider></HouseholdProvider></NotificationProvider></ReferenceProvider>;
}
export default function Layout() { return <App><Routes /></App>; }

import { Stack } from 'expo-router';
import { ResidentProvider } from '../../temporary-residents/context';
export default function Layout() {
  return <ResidentProvider><Stack screenOptions={{ headerShown: false, gestureEnabled: false }} /></ResidentProvider>;
}

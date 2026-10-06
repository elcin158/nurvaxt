import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../App';
export default function Profile() {
  return <View style={{ flex: 1 }}><Pressable onPress={() => router.replace('/temporary-residents')} accessibilityRole="button"
    style={{ padding: 20, backgroundColor: '#102C3D' }}><Text style={{ color: '#FFF' }}>← Müvəqqəti yaşayan şəxslər</Text></Pressable>{useAuth().screen}</View>;
}

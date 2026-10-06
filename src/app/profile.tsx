import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../App';
export default function Profile() {
  return <View style={{ flex: 1, backgroundColor: '#E5EDF9' }}><Pressable onPress={() => router.replace('/temporary-residents')} accessibilityRole="button"
    style={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 12, minHeight: 44 }}><Text style={{ color: '#007BFF', fontSize: 15, fontWeight: '600' }}>← Müvəqqəti yaşayan şəxslər</Text></Pressable>{useAuth().screen}</View>;
}

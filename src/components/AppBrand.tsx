import { Image, StyleSheet, Text, View } from 'react-native';

// Mirrors Tbu.Web's topbar brand: the home mark in a white tile beside the register name.
export function AppBrand() {
  return <View style={styles.brand} accessibilityRole="header">
    <View style={styles.mark}><Image source={require('../../assets/brand-mark.png')} style={styles.icon} accessible={false} /></View>
    <Text numberOfLines={1} style={styles.title}>Ev təsərrüfatlarının reyestri</Text>
  </View>;
}
const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  mark: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  icon: { width: 20, height: 20 }, title: { flexShrink: 1, color: '#FFF', fontSize: 15, fontWeight: '600', lineHeight: 24 },
});

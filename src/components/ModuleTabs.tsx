import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { colors } from './ResidentControls';

// The two registers of Tbu.Web's sidebar. Each keeps its own device records and reference data.
const modules = [
  { href: '/households', label: 'Ev təsərrüfatları' },
  { href: '/temporary-residents', label: 'Müvəqqəti yaşayan şəxslər' },
] as const;
export function ModuleTabs({ active }: { active: (typeof modules)[number]['href'] }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.row}>
    {modules.map(item => <Pressable key={item.href} accessibilityRole="tab" accessibilityState={{ selected: item.href === active }}
      onPress={() => { if (item.href !== active) router.replace(item.href); }} style={[styles.tab, item.href === active && styles.active]}>
      <Text style={[styles.text, item.href === active && { color: colors.primary }]}>{item.label}</Text>
    </Pressable>)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  row: { gap: 6 }, tab: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 6, backgroundColor: '#FFFFFF22' },
  active: { backgroundColor: '#FFF' }, text: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});

import type React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../components/ResidentControls';
import { animalCount } from './schema';
import { accountAddress, animalLines, display, fieldLabel, visibleFields } from './present';
import type { Catalog, ResidentData } from './types';

/** Read-only presentation of a resident record, used for server reports and locked device records. */
export function ResidentView({ data, accountNumber, address, catalog, banner }: {
  data: ResidentData; accountNumber?: string; address?: string | null; catalog: Catalog; banner?: React.ReactNode;
}) {
  const twoColumns = useWindowDimensions().width >= 1000;
  const row = (label: string, value: string, full = false) => <View key={label} style={[styles.cell, twoColumns && !full && { width: '48%' }]}>
    <Text style={styles.label}>{label}</Text><Text style={styles.value}>{value || '—'}</Text></View>;
  const animals = animalLines(data, catalog, id => animalCount(id, catalog, data.counts));
  const others = data.otherAnimals.filter(x => x.count > 0);
  return <ScrollView contentContainerStyle={styles.form}><View style={styles.inner}>
    {banner}
    <View style={styles.section}><Text style={styles.sectionTitle}>Şəxsi hesab</Text><View style={styles.grid}>
      {row('Hesabat ili', String(data.reportYear))}{row('Şəxsi hesab №', accountNumber || 'Sinxronizasiyadan sonra veriləcək')}
      {row('Ünvan', address || accountAddress(data, catalog), true)}</View></View>
    {visibleFields(data.personal, catalog).map(section => <View key={section.title} style={styles.section}><Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.grid}>{section.fields.map(field => row(fieldLabel(field), display(field, data.personal, catalog), field.full))}</View></View>)}
    <View style={styles.section}><Text style={styles.sectionTitle}>Heyvanlar</Text>
      {animals.length || others.length ? <>
        {animals.map(x => <View key={x.id} style={[styles.animal, { paddingLeft: 16 + x.depth * 16 }]}><Text style={[styles.value, { flex: 1 }, !x.depth && { fontWeight: '600' }]}>{x.label}</Text><Text style={styles.value}>{x.count}</Text></View>)}
        {others.map((x, i) => <View key={`other-${i}`} style={styles.animal}><Text style={[styles.value, { flex: 1 }]}>{x.name}</Text><Text style={styles.value}>{x.count}</Text></View>)}
      </> : <Text style={[styles.value, { padding: 16 }]}>Heyvan qeyd edilməyib</Text>}</View>
  </View></ScrollView>;
}
const styles = StyleSheet.create({
  form: { padding: 20, alignItems: 'center' }, inner: { width: '100%', maxWidth: 820, gap: 24 },
  section: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, overflow: 'hidden' }, sectionTitle: { backgroundColor: '#F8FAFC', color: colors.text, fontSize: 15, fontWeight: '600', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 }, cell: { width: '100%', gap: 4 }, label: { color: colors.muted, fontSize: 13, lineHeight: 19 }, value: { color: colors.text, fontSize: 14, lineHeight: 21 },
  animal: { flexDirection: 'row', gap: 12, padding: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
});

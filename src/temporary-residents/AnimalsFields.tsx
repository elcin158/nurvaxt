import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, colors, Input } from '../components/ResidentControls';
import { animalCount } from './schema';
import type { Animal, Catalog, ResidentData } from './types';
function Count({ label, value, onChange }: { label: string; value: number; onChange(value: number): void }) {
  return <View style={styles.countRow}><Text style={styles.label}>{label}</Text><View style={styles.stepper}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: azalt`} disabled={value <= 0} onPress={() => onChange(Math.max(0, value - 1))} style={styles.sign}><Text style={styles.signText}>−</Text></Pressable>
    <TextInput accessibilityLabel={`${label}: sayı`} value={String(value)} keyboardType="number-pad" selectTextOnFocus maxLength={10}
      onChangeText={s => { if (/^\d*$/.test(s)) onChange(Math.min(2147483647, Number(s))); }} style={styles.count} />
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: artır`} onPress={() => onChange(Math.min(2147483647, value + 1))} style={styles.sign}><Text style={styles.signText}>+</Text></Pressable>
  </View></View>;
}
function Branch({ item, catalog, data, onChange, root = false }: { item: Animal; catalog: Catalog; data: ResidentData; onChange(data: ResidentData): void; root?: boolean }) {
  const [expanded, setExpanded] = useState(!root);
  const children = catalog.animals.filter(x => x.parentId === item.id);
  const set = (count: number) => onChange({ ...data, counts: { ...data.counts, [item.id]: count } });
  if (!children.length) return <Count label={item.label.replace(/:$/, '')} value={data.counts[item.id] ?? 0} onChange={set} />;
  return <View style={root ? styles.root : styles.branch}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.heading}>
      <Text style={styles.signText}>{expanded ? '−' : '+'}</Text><Text style={[styles.label, { fontWeight: '600' }]}>{item.label.replace(/:$/, '')}</Text>
      {(root || item.isComputed) && <Text style={styles.total}>{animalCount(item.id, catalog, data.counts)}</Text>}
    </Pressable>
    {expanded && <View style={styles.children}>
      {!root && !item.isComputed && <Count label={item.label} value={data.counts[item.id] ?? 0} onChange={set} />}
      {children.map(child => <Branch key={child.id} item={child} catalog={catalog} data={data} onChange={onChange} />)}
    </View>}
  </View>;
}
export function AnimalsFields({ data, catalog, onChange }: { data: ResidentData; catalog: Catalog; onChange(data: ResidentData): void }) {
  return <View style={{ gap: 16 }}>
    {catalog.animals.filter(x => x.parentId == null && !x.label.includes('Digər')).map(item => <Branch root key={item.id} item={item} catalog={catalog} data={data} onChange={onChange} />)}
    <View style={styles.root}><View style={styles.heading}><Text style={[styles.label, { fontWeight: '600' }]}>Digər heyvan növləri</Text><Text style={styles.total}>{data.otherAnimals.reduce((sum, x) => sum + x.count, 0)}</Text></View>
      <View style={styles.children}>{data.otherAnimals.map((animal, index) => <View key={index} style={styles.other}>
        <Input label="Heyvanın növü" value={animal.name} maxLength={200} onChangeText={name => onChange({ ...data, otherAnimals: data.otherAnimals.map((x, i) => i === index ? { ...x, name } : x) })} />
        <Count label="Sayı" value={animal.count} onChange={count => onChange({ ...data, otherAnimals: data.otherAnimals.map((x, i) => i === index ? { ...x, count } : x) })} />
        <Button secondary label="Sətri sil" onPress={() => onChange({ ...data, otherAnimals: data.otherAnimals.filter((_, i) => i !== index) })} />
      </View>)}<Button secondary label="+ Əlavə et" onPress={() => onChange({ ...data, otherAnimals: [...data.otherAnimals, { name: '', count: 0 }] })} /></View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, overflow: 'hidden' }, branch: { borderBottomWidth: 1, borderBottomColor: colors.line },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#F8FAFC', minHeight: 62 },
  children: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 }, label: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
  total: { minWidth: 60, padding: 10, textAlign: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 6, color: colors.text },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 6 },
  sign: { width: 42, minHeight: 46, alignItems: 'center', justifyContent: 'center' }, signText: { color: colors.primary, fontSize: 24 },
  count: { width: 60, minHeight: 46, textAlign: 'center', color: colors.text, fontSize: 15 }, other: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 16 },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, colors, Input, useReadOnly } from '../components/ResidentControls';
import { Tree, TreeItem, TreeStub } from '../components/Tree';
import { animalCount } from './schema';
import type { Animal, Catalog, ResidentData } from './types';
function Count({ label, value, onChange }: { label: string; value: number; onChange(value: number): void }) {
  const readOnly = useReadOnly();
  return <View style={styles.countRow}><Text style={styles.label}>{label}</Text><View style={[styles.stepper, readOnly && styles.disabled]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: azalt`} disabled={readOnly || value <= 0} onPress={() => onChange(Math.max(0, value - 1))} style={styles.sign}><Text style={[styles.signText, readOnly && styles.signOff]}>−</Text></Pressable>
    <TextInput accessibilityLabel={`${label}: sayı`} value={String(value)} editable={!readOnly} keyboardType="number-pad" selectTextOnFocus maxLength={10}
      onChangeText={s => { if (/^\d*$/.test(s)) onChange(Math.min(2147483647, Number(s))); }} style={styles.count} />
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: artır`} disabled={readOnly} onPress={() => onChange(Math.min(2147483647, value + 1))} style={styles.sign}><Text style={[styles.signText, readOnly && styles.signOff]}>+</Text></Pressable>
  </View></View>;
}
type Catalogue = { animals: Animal[] };
// Where a row's tie meets it: the middle of a count row (12 + 46 / 2) and of a 62 px heading.
const COUNT_Y = 35, HEADING_Y = 31;
function Branch({ item, catalog, counts, onChange, root = false }: { item: Animal; catalog: Catalogue; counts: Record<string, number>; onChange(counts: Record<string, number>): void; root?: boolean }) {
  const [expanded, setExpanded] = useState(!root);
  const children = catalog.animals.filter(x => x.parentId === item.id);
  const set = (count: number) => onChange({ ...counts, [item.id]: count });
  if (!children.length) return <Count label={item.label.replace(/:$/, '')} value={counts[item.id] ?? 0} onChange={set} />;
  return <View style={root ? styles.root : styles.branch}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.heading}>
      <View style={styles.signBox}><Text style={styles.signText}>{expanded ? '−' : '+'}</Text></View><Text style={[styles.label, { fontWeight: '600' }]}>{item.label.replace(/:$/, '')}</Text>
      {(root || item.isComputed) && <Text style={styles.total}>{animalCount(item.id, catalog, counts)}</Text>}
      {/* Tbu.Web's tree lines: the spine leaves the sign (centred 26 px in) and ties into each row. */}
      {expanded && <TreeStub centred x={26} from={12} />}
    </Pressable>
    {expanded && <View style={[styles.children, styles.tree]}><Tree start={0} gap={12}>
      {!root && !item.isComputed && <TreeItem y={COUNT_Y}><Count label={item.label} value={counts[item.id] ?? 0} onChange={set} /></TreeItem>}
      {children.map(child => <TreeItem key={child.id} y={catalog.animals.some(x => x.parentId === child.id) ? HEADING_Y : COUNT_Y}>
        <Branch item={child} catalog={catalog} counts={counts} onChange={onChange} /></TreeItem>)}
    </Tree></View>}
  </View>;
}
/** The livestock type tree of Tbu.Web: roots fold open, computed branches show their totals. */
export function AnimalTree({ catalog, counts, onChange, roots }: { catalog: Catalogue; counts: Record<string, number>; onChange(counts: Record<string, number>): void; roots?: Animal[] }) {
  return <>{(roots ?? catalog.animals.filter(x => x.parentId == null)).map(item =>
    <Branch root key={item.id} item={item} catalog={catalog} counts={counts} onChange={onChange} />)}</>;
}
export function AnimalsFields({ data, catalog, onChange }: { data: ResidentData; catalog: Catalog; onChange(data: ResidentData): void }) {
  // Under review only the folds open; the rows and their buttons are disabled, as on the web form.
  const readOnly = useReadOnly();
  return <View style={{ gap: 16 }}>
    <AnimalTree catalog={catalog} counts={data.counts} onChange={counts => onChange({ ...data, counts })}
      roots={catalog.animals.filter(x => x.parentId == null && !x.label.includes('Digər'))} />
    <View style={styles.root}><View style={styles.heading}><Text style={[styles.label, { fontWeight: '600' }]}>Digər heyvan növləri</Text><Text style={styles.total}>{data.otherAnimals.reduce((sum, x) => sum + x.count, 0)}</Text></View>
      <View style={styles.children}>{data.otherAnimals.map((animal, index) => <View key={index} style={styles.other}>
        <Input label="Heyvanın növü" value={animal.name} maxLength={200} onChangeText={name => onChange({ ...data, otherAnimals: data.otherAnimals.map((x, i) => i === index ? { ...x, name } : x) })} />
        <Count label="Sayı" value={animal.count} onChange={count => onChange({ ...data, otherAnimals: data.otherAnimals.map((x, i) => i === index ? { ...x, count } : x) })} />
        <Button secondary label="Sətri sil" disabled={readOnly} onPress={() => onChange({ ...data, otherAnimals: data.otherAnimals.filter((_, i) => i !== index) })} />
      </View>)}<Button secondary label="+ Əlavə et" disabled={readOnly} onPress={() => onChange({ ...data, otherAnimals: [...data.otherAnimals, { name: '', count: 0 }] })} /></View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, overflow: 'hidden' }, branch: { borderBottomWidth: 1, borderBottomColor: colors.line },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#F8FAFC', minHeight: 62 },
  children: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 }, tree: { paddingLeft: 44 }, signBox: { width: 20, alignItems: 'center' }, label: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
  total: { minWidth: 60, padding: 10, textAlign: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 6, color: colors.text },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 6 },
  sign: { width: 42, minHeight: 46, alignItems: 'center', justifyContent: 'center' }, signText: { color: colors.primary, fontSize: 24 },
  disabled: { backgroundColor: '#E2E8F0' }, signOff: { color: '#94A3B8' }, count: { width: 60, minHeight: 46, textAlign: 'center', color: colors.text, fontSize: 15 }, other: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 16 },
});

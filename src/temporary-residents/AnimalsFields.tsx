import { StyleSheet, Text, TextInput, View } from 'react-native';
import { FieldShell, useReadOnly } from '../components/ResidentControls';
import { TIE, Tree, TreeItem } from '../components/Tree';
import { Branch, Fold } from '../households/StepEditors';
import { numbers } from '../households/numbers';
import { Amount, Card, CountBox, DeleteIcon, Stepper, WebButton, web } from '../households/web';
import { animalCount } from './schema';
import type { Animal, Catalog, ResidentData } from './types';

// Tbu.Web's temporary resident animal page (Form.cshtml, _TemporaryAnimalBranch.cshtml): a root
// without children is a card with its count box; any other root folds open to its branches, a
// herd shows its own count (or "Cəmi" when computed) above its children; "Digər heyvan növləri"
// is a fold of name / count / bin rows with a full-width "Əlavə et" under them.
type Catalogue = { animals: Animal[] };
const label = (item: Animal) => item.label.trim().replace(/:$/, '');
const count = (value: number | undefined) => value ? String(value) : '';

function Node({ item, catalog, counts, onChange }: { item: Animal; catalog: Catalogue; counts: Record<string, number>; onChange(counts: Record<string, number>): void }) {
  const children = catalog.animals.filter(x => x.parentId === item.id);
  const set = (value: string) => onChange({ ...counts, [item.id]: Math.min(2147483647, Number(value || 0)) });
  const field = (text: string) => <View style={styles.field}><Stepper label={text} number={numbers.animal(item.code)} calculated={item.isComputed}
    value={count(item.isComputed ? animalCount(item.id, catalog, counts) : counts[item.id])} onChange={set} /></View>;
  if (!children.length) return field(label(item));
  return <Branch tree title={label(item)}><Tree>
    <TreeItem y={TIE.field}>{field(item.isComputed ? 'Cəmi' : label(item))}</TreeItem>
    {children.map(child => <TreeItem key={child.id} y={catalog.animals.some(x => x.parentId === child.id) ? TIE.header : TIE.field}>
      <Node item={child} catalog={catalog} counts={counts} onChange={onChange} /></TreeItem>)}
  </Tree></Branch>;
}

/** The livestock type tree of Tbu.Web: roots fold open, computed branches show their totals. */
export function AnimalTree({ catalog, counts, onChange, roots }: { catalog: Catalogue; counts: Record<string, number>; onChange(counts: Record<string, number>): void; roots?: Animal[] }) {
  return <>{(roots ?? catalog.animals.filter(x => x.parentId == null)).map(root => {
    const children = catalog.animals.filter(x => x.parentId === root.id);
    if (!children.length) return <Card key={root.id} style={styles.standalone}><View style={styles.inline}>
      <Text style={styles.rootLabel}>{label(root)}</Text>
      <View style={{ width: 96 }}><Amount hideLabel decimal={false} label={label(root)} value={count(counts[root.id])}
        onChange={v => onChange({ ...counts, [root.id]: Math.min(2147483647, Number(v || 0)) })} /></View>
    </View></Card>;
    return <Fold key={root.id} title={label(root)} total={<CountBox label={`${label(root)} üzrə cəmi`} value={animalCount(root.id, catalog, counts)} />}>
      <View style={{ paddingLeft: 28 }}><Tree start={16}>{children.map(child => <TreeItem key={child.id}
        y={catalog.animals.some(x => x.parentId === child.id) ? TIE.header : TIE.field}>
        <Node item={child} catalog={catalog} counts={counts} onChange={onChange} /></TreeItem>)}</Tree></View>
    </Fold>;
  })}</>;
}

export function AnimalsFields({ data, catalog, onChange }: { data: ResidentData; catalog: Catalog; onChange(data: ResidentData): void }) {
  const readOnly = useReadOnly();
  const setOther = (index: number, patch: Partial<ResidentData['otherAnimals'][number]>) =>
    onChange({ ...data, otherAnimals: data.otherAnimals.map((x, i) => i === index ? { ...x, ...patch } : x) });
  return <View style={{ gap: 20 }}>
    <AnimalTree catalog={catalog} counts={data.counts} onChange={counts => onChange({ ...data, counts })}
      roots={catalog.animals.filter(x => x.parentId == null && !x.label.includes('Digər'))} />
    <Fold title="Digər heyvan növləri" total={<CountBox label="Digər heyvanlar üzrə cəmi" value={data.otherAnimals.reduce((sum, x) => sum + x.count, 0)} />}>
      {data.otherAnimals.map((animal, index) => <View key={index} style={styles.otherRow}>
        <View style={{ flex: 1 }}><FieldShell label="Heyvanın növü"><TextInput accessibilityLabel="Heyvanın növü" value={animal.name} maxLength={200}
          editable={!readOnly} placeholder={readOnly ? undefined : 'Daxil edin'} placeholderTextColor={web.muted}
          onChangeText={name => setOther(index, { name })} style={[styles.input, readOnly && { backgroundColor: web.disabled }]} /></FieldShell></View>
        <View style={{ width: 110 }}><Stepper label="Sayı" value={String(animal.count)} onChange={v => setOther(index, { count: Math.min(2147483647, Number(v || 0)) })} /></View>
        <DeleteIcon label="Heyvan sətirini sil" onPress={() => onChange({ ...data, otherAnimals: data.otherAnimals.filter((_, i) => i !== index) })} />
      </View>)}
      <WebButton secondary label="Əlavə et" disabled={readOnly} onPress={() => onChange({ ...data, otherAnimals: [...data.otherAnimals, { name: '', count: 0 }] })} />
    </Fold>
  </View>;
}

const styles = StyleSheet.create({
  standalone: { paddingVertical: 15 }, inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rootLabel: { flex: 1, color: web.text, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  field: { width: '100%', maxWidth: 310 },
  otherRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { height: 48, paddingHorizontal: 11, borderWidth: 1, borderColor: web.border, borderRadius: 6, backgroundColor: '#FFF', color: web.input, fontSize: 14 },
});

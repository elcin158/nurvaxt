import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export const colors = { primary: '#0F62FE', pale: '#E5F1FF', bg: '#F1F5F9', border: '#CBD5E1', line: '#E2E8F0', text: '#1E293B', muted: '#64748B' };
export function Button({ label, onPress, secondary, disabled, small }: { label: string; onPress(): void; secondary?: boolean; disabled?: boolean; small?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.button, secondary && ui.secondary, small && { paddingHorizontal: 12 }, (disabled || pressed) && { opacity: 0.5 }]}>
    <Text style={[ui.buttonText, secondary && { color: colors.text }]}>{label}</Text>
  </Pressable>;
}
export function FieldShell({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return <View style={ui.field}><Text style={ui.label}>{label}{required && <Text style={{ color: '#DC2626' }}> *</Text>}</Text>
    {children}{!!error && <Text accessibilityRole="alert" style={ui.errorText}>{error}</Text>}</View>;
}
export function Input({ label, required, error, ...props }: TextInputProps & { label: string; required?: boolean; error?: string }) {
  return <FieldShell label={label} required={required} error={error}><TextInput placeholder="Daxil edin" placeholderTextColor={colors.muted}
    accessibilityLabel={label} {...props} style={[ui.input, !!error && { borderColor: '#DC2626' }, props.style]} /></FieldShell>;
}
export type Choice = { id: string | number; label: string };
// Tbu.Web's custom select: the list opens as a popover attached to the field (below it, or above
// when there is no room), with a search box for longer lists. Rows have a fixed height so even
// the 30k-row institution list scrolls smoothly and opens on the current selection.
const ROW = 44, SEARCH_FROM = 8;
function Chevron({ up, disabled }: { up?: boolean; disabled?: boolean }) {
  return <View style={ui.chevronBox}><View style={[ui.chevronMark, up && ui.chevronUp, disabled && { borderColor: '#94A3B8' }]} /></View>;
}
type Anchor = { x: number; y: number; width: number; height: number };
export function Select({ label, value, items, onChange, required, error, disabled }: {
  label: string; value: string | number | null | undefined; items: Choice[];
  onChange(value: string | number | null): void; required?: boolean; error?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [anchor, setAnchor] = useState<Anchor | null>(null);
  const [keyboard, setKeyboard] = useState(0);
  const trigger = useRef<View>(null), screen = useWindowDimensions(), insets = useSafeAreaInsets();
  useEffect(() => {
    if (!open) return;
    const shown = Keyboard.addListener('keyboardDidShow', event => setKeyboard(event.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => { shown.remove(); hidden.remove(); };
  }, [open]);
  // Lists reach tens of thousands of rows (education institutions, positions), and
  // toLocaleLowerCase('az-AZ') is slow on Hermes. Filter only while the list is open and the
  // operator has typed something; a closed field renders without touching the list.
  const labels = useMemo(() => open ? items.map(x => x.label.toLocaleLowerCase('az-AZ')) : [], [items, open]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('az-AZ');
    if (!open || !needle) return items;
    return items.filter((_, i) => labels[i].includes(needle));
  }, [items, labels, query, open]);
  const selected = items.find(x => x.id === value), searchable = items.length >= SEARCH_FROM;
  // As in the web form, an optional list starts with its placeholder, which clears the choice.
  const rows: (Choice | null)[] = useMemo(() => !required && !query ? [null, ...filtered] : filtered, [required, query, filtered]);
  const show = () => trigger.current?.measureInWindow((x, y, width, height) => { setAnchor({ x, y, width, height }); setQuery(''); setOpen(true); });
  const pick = (next: string | number | null) => { onChange(next); setOpen(false); setKeyboard(0); };
  let panel: object = {}, maxHeight = 240;
  if (anchor) {
    const below = screen.height - keyboard - (anchor.y + anchor.height) - 12, above = anchor.y - insets.top - 12;
    const up = below < 200 && above > below;
    maxHeight = Math.max(140, Math.min(searchable ? 300 : 240, up ? above : below));
    panel = up ? { bottom: screen.height - anchor.y + 4 } : { top: anchor.y + anchor.height + 4 };
    panel = { ...panel, left: anchor.x, width: anchor.width };
  }
  const selectedIndex = selected ? rows.indexOf(selected) : -1;
  return <FieldShell label={label} required={required} error={error}>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label ?? 'Seçim edin'}`} disabled={disabled}
      accessibilityState={{ disabled, expanded: open }} onPress={show}
      style={[ui.input, ui.select, open && ui.selectOpen, disabled && ui.selectDisabled, !!error && ui.selectError]}>
      <Text numberOfLines={1} style={[ui.selectText, !selected && { color: colors.muted }]}>{selected?.label ?? (value ? 'Saxlanmış seçim (arayışı yeniləyin)' : 'Seçim edin')}</Text>
      <Chevron up={open} disabled={disabled} />
    </Pressable>
    <Modal visible={open} transparent statusBarTranslucent animationType="none" onRequestClose={() => setOpen(false)}>
      <Pressable accessibilityLabel="Siyahını bağla" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
      <View style={[ui.popover, panel, { maxHeight }]}>
        {searchable && <View style={ui.searchShell}><View style={ui.searchGlass} />
          <TextInput placeholder="Axtar" placeholderTextColor={colors.muted} accessibilityLabel={`${label} üzrə axtarış`} value={query} onChangeText={setQuery} style={ui.searchInput} /></View>}
        <FlatList data={rows} keyExtractor={x => x ? String(x.id) : 'placeholder'} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={ui.options}
          getItemLayout={(_, index) => ({ length: ROW + 2, offset: (ROW + 2) * index, index })} initialScrollIndex={selectedIndex > 2 ? selectedIndex - 1 : undefined}
          initialNumToRender={12} windowSize={5}
          renderItem={({ item }) => {
            const active = item ? value === item.id : false;
            return <Pressable accessibilityRole="menuitem" accessibilityState={{ selected: active }} onPress={() => pick(item ? item.id : null)}
              style={({ pressed }) => [ui.option, active && ui.optionActive, pressed && !active && ui.optionPressed]}>
              <Text numberOfLines={2} style={[ui.optionText, !item && { color: colors.muted }, active && ui.optionTextActive]}>{item ? item.label : 'Seçim edin'}</Text>
            </Pressable>;
          }}
          ListEmptyComponent={<Text style={ui.empty}>{query ? 'Nəticə tapılmadı' : 'Seçim yoxdur. Arayışları yeniləyin.'}</Text>} />
      </View>
    </Modal>
  </FieldShell>;
}
export function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange(): void; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onChange} style={ui.checkRow}>
    <View style={[ui.check, checked && { backgroundColor: colors.primary, borderColor: colors.primary }]}>{checked && <Text style={{ color: '#FFF', fontWeight: '700' }}>✓</Text>}</View>
    <Text style={[ui.label, { flex: 1 }]}>{label}</Text>
  </Pressable>;
}
export function BooleanField({ label, value, onChange, required, error }: { label: string; value: boolean | null | undefined; onChange(value: boolean): void; required?: boolean; error?: string }) {
  return <FieldShell label={label} required={required} error={error}><View style={ui.radios}>{[true, false].map(x =>
    <Pressable key={String(x)} accessibilityRole="radio" accessibilityState={{ selected: value === x }} accessibilityLabel={`${label}: ${x ? 'Bəli' : 'Xeyr'}`}
      onPress={() => onChange(x)} style={ui.radio}><View style={[ui.radioDot, value === x && { borderColor: colors.primary, borderWidth: 6 }]} /><Text style={ui.label}>{x ? 'Bəli' : 'Xeyr'}</Text></Pressable>)}</View></FieldShell>;
}
export const ui = StyleSheet.create({
  field: { gap: 7 }, label: { color: colors.text, fontSize: 14, lineHeight: 21 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFF', color: colors.text, fontSize: 14 },
  // Field and list styles follow Tbu.Web's evtas.css custom select.
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderColor: '#CBD5E1',
    shadowColor: '#121217', shadowOpacity: 0.05, shadowRadius: 1, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  selectText: { color: '#334155', fontSize: 14, lineHeight: 18, flex: 1 },
  selectOpen: { borderColor: '#0F62FE' }, selectDisabled: { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1', elevation: 0 }, selectError: { borderColor: '#F87171' },
  chevronBox: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  chevronMark: { width: 7, height: 7, borderRightWidth: 1.6, borderBottomWidth: 1.6, borderColor: '#475569', transform: [{ rotate: '45deg' }], marginTop: -3 },
  chevronUp: { transform: [{ rotate: '225deg' }], marginTop: 4 },
  popover: { position: 'absolute', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, padding: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  searchShell: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 38, marginHorizontal: 9, marginTop: 7, marginBottom: 3, paddingHorizontal: 11,
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, backgroundColor: '#FFF' },
  searchGlass: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.6, borderColor: '#64748B' },
  searchInput: { flex: 1, height: 36, padding: 0, color: '#334155', fontSize: 14 },
  options: { padding: 3.5 },
  option: { height: ROW, marginBottom: 2, paddingHorizontal: 10.5, borderRadius: 4, justifyContent: 'center' },
  optionActive: { backgroundColor: '#EFF6FF' }, optionPressed: { backgroundColor: '#F1F5F9' },
  optionText: { color: '#1E293B', fontSize: 14, lineHeight: 18 }, optionTextActive: { color: '#0F172A', fontWeight: '500' },
  button: { backgroundColor: colors.primary, minHeight: 46, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary },
  secondary: { backgroundColor: '#FFF', borderColor: colors.border }, buttonText: { color: '#FFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorText: { fontSize: 12, lineHeight: 18, color: '#B91C1C' }, empty: { padding: 16, textAlign: 'center', color: colors.muted, lineHeight: 21 },
  modal: { flex: 1, padding: 20, gap: 16, backgroundColor: '#FFF' }, modalHeader: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text, flex: 1 },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 48, paddingVertical: 8 }, check: { width: 22, height: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  radios: { flexDirection: 'row', gap: 28 }, radio: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 48 }, radioDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
});

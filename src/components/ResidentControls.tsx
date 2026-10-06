import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
export function Select({ label, value, items, onChange, required, error, disabled }: {
  label: string; value: string | number | null | undefined; items: Choice[];
  onChange(value: string | number | null): void; required?: boolean; error?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const filtered = useMemo(() => items.filter(x => x.label.toLocaleLowerCase('az-AZ').includes(query.trim().toLocaleLowerCase('az-AZ'))), [items, query]);
  const selected = items.find(x => x.id === value);
  return <FieldShell label={label} required={required} error={error}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label ?? 'Seçim edin'}`} disabled={disabled}
      accessibilityState={{ disabled, expanded: open }} style={[ui.input, ui.select, disabled && { backgroundColor: colors.bg }, !!error && { borderColor: '#DC2626' }]}
      onPress={() => { setQuery(''); setOpen(true); }}>
      <Text style={[ui.selectText, !selected && { color: colors.muted }]}>{selected?.label ?? (value ? 'Saxlanmış seçim (arayışı yeniləyin)' : 'Seçim edin')}</Text><Text style={ui.chevron}>⌄</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={ui.modal}><View style={ui.modalHeader}><Text style={ui.modalTitle}>{label}</Text><Button secondary label="Bağla" onPress={() => setOpen(false)} /></View>
        <TextInput autoFocus placeholder="Axtarış" accessibilityLabel={`${label} üzrə axtarış`} value={query} onChangeText={setQuery} style={ui.input} />
        <FlatList data={filtered} keyExtractor={x => String(x.id)} keyboardShouldPersistTaps="handled"
          ListHeaderComponent={!required ? <Pressable style={ui.option} onPress={() => { onChange(null); setOpen(false); }}><Text style={ui.label}>Seçimi təmizlə</Text></Pressable> : null}
          ListEmptyComponent={<Text style={ui.empty}>Seçim tapılmadı. Arayış məlumatlarını onlayn yeniləyin.</Text>}
          renderItem={({ item }) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: value === item.id }} style={ui.option}
            onPress={() => { onChange(item.id); setOpen(false); }}><Text style={[ui.selectText, value === item.id && { color: colors.primary }]}>{item.label}</Text>{value === item.id && <Text style={{ color: colors.primary }}>✓</Text>}</Pressable>} />
      </SafeAreaView>
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
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, selectText: { color: colors.text, fontSize: 14, lineHeight: 21, flexShrink: 1 }, chevron: { color: colors.muted, fontSize: 20 },
  button: { backgroundColor: colors.primary, minHeight: 46, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary },
  secondary: { backgroundColor: '#FFF', borderColor: colors.border }, buttonText: { color: '#FFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorText: { fontSize: 12, lineHeight: 18, color: '#B91C1C' }, empty: { padding: 28, textAlign: 'center', color: colors.muted, lineHeight: 23 },
  modal: { flex: 1, padding: 20, gap: 16, backgroundColor: '#FFF' }, modalHeader: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text, flex: 1 },
  option: { paddingVertical: 18, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 48, paddingVertical: 8 }, check: { width: 22, height: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  radios: { flexDirection: 'row', gap: 28 }, radio: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 48 }, radioDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
});

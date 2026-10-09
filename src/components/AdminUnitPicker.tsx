import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AddressBook, AdminScope, AdminUnit } from '../reference/types';
import { colors, FieldShell, ui, useReadOnly } from './ResidentControls';

// Tbu.Web's admin unit picker: the field shows the chosen unit's path ("A / B / C"); the panel
// opens under the field (above it when there is no room) and browses the tree level by level from
// "Bütün ərazilər", with the path as breadcrumbs, ✕ to start over, and a search over the current
// level. A unit that cannot be chosen only leads to its children.
export function AdminUnitPicker({ label, required, error, value, book, scope, onChange }: {
  label: string; required?: boolean; error?: string; value: number | null; book: AddressBook; scope: AdminScope; onChange(id: number): void;
}) {
  const [open, setOpen] = useState(false), [trail, setTrail] = useState<AdminUnit[]>([]), [query, setQuery] = useState('');
  const [keyboard, setKeyboard] = useState(0), [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const trigger = useRef<View>(null), disabled = useReadOnly();
  const screen = useWindowDimensions(), insets = useSafeAreaInsets();
  useEffect(() => {
    if (!open) return;
    const shown = Keyboard.addListener('keyboardDidShow', event => setKeyboard(event.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => { shown.remove(); hidden.remove(); };
  }, [open]);
  const selected = useMemo(() => book.path(value), [book, value]);
  const parent = trail.at(-1)?.id ?? null;
  const items = useMemo(() => open ? book.children(parent, scope) : [], [open, book, parent, scope]);
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('az-AZ');
    return needle ? items.filter(x => x.label.toLocaleLowerCase('az-AZ').includes(needle)) : items;
  }, [items, query]);
  const navigate = (nodes: AdminUnit[]) => { setTrail(nodes); setQuery(''); };
  const show = () => trigger.current?.measureInWindow((x, y, width, height) => { setAnchor({ x, y, width, height }); navigate(selected.slice(0, -1)); setOpen(true); });
  const close = () => { setOpen(false); setKeyboard(0); };
  const text = selected.length ? selected.map(x => x.label).join(' / ') : value ? 'Saxlanmış ərazi' : '';
  // Placed as the select popover is: below the field, or above when the space below is short.
  // The panel fits its rows up to this height, so a level of one or two areas stays small.
  let place: object = {}, maxHeight = 360;
  if (anchor) {
    const below = screen.height - keyboard - (anchor.y + anchor.height) - Math.max(insets.bottom, 12) - 4, above = anchor.y - insets.top - 12;
    const up = below < 280 && above > below;
    maxHeight = Math.max(220, Math.min(420, up ? above : below));
    place = { ...up ? { bottom: screen.height - anchor.y + 4 } : { top: anchor.y + anchor.height + 4 }, left: anchor.x, width: anchor.width };
  }
  return <FieldShell label={label} required={required} error={error}>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={`${label}: ${text || 'İnzibati ərazi seçin'}`} accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={show}
      style={[ui.input, ui.select, open && ui.selectOpen, disabled && ui.selectDisabled, !!error && ui.selectError]}>
      <Text numberOfLines={2} style={[ui.selectText, !text && { color: colors.muted }]}>{text || (disabled ? '' : 'İnzibati ərazi seçin')}</Text>
      <View style={ui.chevronBox}><View style={[ui.chevronMark, open && ui.chevronUp]} /></View>
    </Pressable>
    <Modal visible={open} transparent statusBarTranslucent animationType="none" onRequestClose={close}>
      <Pressable accessibilityLabel="Paneli bağla" style={styles.backdrop} onPress={close} />
      <View accessibilityViewIsModal style={[ui.popover, place, { maxHeight }]}>
        <View style={styles.header}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.crumbs} accessibilityLabel="İnzibati ərazi yolu">
          <Pressable accessibilityRole="button" onPress={() => navigate([])}><Text style={[styles.crumb, !trail.length && styles.crumbCurrent]}>Bütün ərazilər</Text></Pressable>
          {trail.map((node, index) => <View key={node.id} style={styles.crumbItem}><Text style={styles.separator}>/</Text>
            <Pressable accessibilityRole="button" onPress={() => navigate(trail.slice(0, index + 1))}>
              <Text numberOfLines={1} style={[styles.crumb, index === trail.length - 1 && styles.crumbCurrent]}>{node.label}</Text></Pressable></View>)}
          </ScrollView>
          <Pressable accessibilityRole="button" accessibilityLabel="Axtarışı sıfırla və bütün ərazilərə qayıt" hitSlop={6} onPress={() => navigate([])} style={styles.close}>
            <Text style={styles.closeText}>✕</Text></Pressable>
        </View>
        <View style={ui.searchShell}><View style={ui.searchGlass} />
          <TextInput placeholder="Ərazi adı ilə axtarın" placeholderTextColor={colors.muted} accessibilityLabel="Ərazi adı ilə axtarın" value={query} onChangeText={setQuery} style={ui.searchInput} /></View>
        <FlatList data={rows} keyExtractor={x => String(x.id)} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.list} initialNumToRender={16}
          renderItem={({ item }) => {
            const canSelect = book.selectable(item, scope), hasChild = book.children(item.id, scope).length > 0, active = item.id === value;
            const into = () => navigate([...trail, item]);
            return <View style={[styles.row, active && styles.rowActive]}>
              <Pressable accessibilityRole="button" accessibilityLabel={canSelect ? `${[...trail, item].map(x => x.label).join(' / ')} seç` : `${item.label} alt ərazilərini aç`}
                disabled={!canSelect && !hasChild} onPress={() => canSelect ? (onChange(item.id), close()) : into()}
                style={({ pressed }) => [styles.pick, pressed && styles.pressed]}>
                <Text style={[styles.label, !canSelect && styles.parentLabel, active && styles.activeLabel]}>{item.label}</Text>
              </Pressable>
              {hasChild && <Pressable accessibilityRole="button" accessibilityLabel={`${item.label} alt ərazilərini aç`} onPress={into}
                style={({ pressed }) => [styles.expand, pressed && styles.pressed]}><Text style={styles.expandText}>›</Text></Pressable>}
            </View>;
          }}
          ListEmptyComponent={<Text style={ui.empty}>{query.trim() ? 'Uyğun ərazi tapılmadı' : 'Seçilə bilən ərazi tapılmadı'}</Text>} />
      </View>
    </Modal>
  </FieldShell>;
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 9, paddingRight: 2, borderBottomWidth: 1, borderBottomColor: colors.line },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }, closeText: { color: colors.muted, fontSize: 14 },
  crumbs: { alignItems: 'center', gap: 2 },
  crumbItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  crumb: { color: colors.primary, fontSize: 13, paddingVertical: 9, paddingHorizontal: 2, maxWidth: 200 }, crumbCurrent: { color: colors.text, fontWeight: '600' },
  separator: { color: colors.muted, fontSize: 13, paddingHorizontal: 2 },
  list: { padding: 3.5 },
  row: { flexDirection: 'row', alignItems: 'stretch', minHeight: 44, borderRadius: 4, marginBottom: 2 }, rowActive: { backgroundColor: '#EFF6FF' },
  pick: { flex: 1, justifyContent: 'center', paddingHorizontal: 10.5, paddingVertical: 9, borderRadius: 4 }, pressed: { backgroundColor: '#F1F5F9' },
  label: { color: colors.text, fontSize: 14, lineHeight: 18 }, parentLabel: { color: colors.muted }, activeLabel: { color: '#0F172A', fontWeight: '500' },
  expand: { width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }, expandText: { color: colors.primary, fontSize: 22, lineHeight: 24, fontWeight: '600' },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, colors } from './ResidentControls';
import { StatusChip, type ChipTone } from './StatusChip';

export type RowChip = { label: string; tone: ChipTone };
/**
 * One record of a module's list. On a tablet it is a row of Tbu.Web's table, with the name, address
 * and status in columns under RecordHeader; the status column holds every chip and the note. On a
 * phone it is a compact card: the first chip at the name's right, one line of details, the address,
 * then any other chips and a one-line note.
 */
export function RecordRow({ wide, title, meta, address, chips, note, check, onOpen, onMenu }: {
  wide: boolean; title: string; meta: string; address: string; chips: RowChip[];
  /** A reason the record cannot be sent, shown under the chips. */
  note?: { text: string; tone: 'warning' | 'danger' };
  check?: { checked: boolean; disabled: boolean; onToggle(): void };
  onOpen(): void; onMenu(): void;
}) {
  const noteText = (lines: number) => !!note && <Text numberOfLines={lines} style={[styles.note, note.tone === 'danger' && { color: '#B91C1C' }]}>{note.text}</Text>;
  const [first, ...rest] = chips;
  const content = wide ? <>
    <View style={styles.nameColumn}>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      <Text numberOfLines={1} style={styles.meta}>{meta}</Text>
    </View>
    <Text numberOfLines={2} style={[styles.address, styles.addressColumn]}>{address}</Text>
    <View style={[styles.status, styles.statusColumn]}>
      <View style={styles.chips}>{chips.map(chip => <StatusChip key={chip.label} {...chip} />)}</View>
      {noteText(2)}
    </View>
  </> : <>
    <View style={styles.titleRow}>
      <Text numberOfLines={1} style={[styles.title, { flex: 1 }]}>{title}</Text>
      {!!first && <StatusChip {...first} />}
    </View>
    <View style={styles.gap}>
      <Text numberOfLines={1} style={styles.meta}>{meta}</Text>
      <Text numberOfLines={1} style={styles.address}>{address}</Text>
    </View>
    {rest.length > 0 && <View style={styles.chips}>{rest.map(chip => <StatusChip key={chip.label} {...chip} />)}</View>}
    {noteText(1)}
  </>;
  return <View style={styles.row}>
    {check && <View style={styles.check}><Check label="" checked={check.checked} disabled={check.disabled} onChange={check.onToggle} /></View>}
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: aç`} onPress={onOpen} onLongPress={onMenu}
      style={({ pressed }) => [styles.body, wide && styles.wideBody, pressed && styles.pressed]}>{content}</Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: əməliyyatlar`} onPress={onMenu} style={styles.more}><Text style={styles.moreText}>⋮</Text></Pressable>
  </View>;
}

/** The column titles above RecordRow on a tablet. */
export function RecordHeader({ columns: [name, address, status], check }: { columns: [string, string, string]; check?: boolean }) {
  return <View style={[styles.row, styles.header]}>
    {check && <View style={styles.check} />}
    <View style={[styles.wideBody, { flex: 1, paddingHorizontal: 4 }]}><Text style={[styles.headerText, styles.nameColumn]}>{name}</Text>
      <Text style={[styles.headerText, styles.addressColumn]}>{address}</Text><Text style={[styles.headerText, styles.statusColumn]}>{status}</Text></View>
    <View style={styles.more} />
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#FFF' },
  check: { width: 32 },
  body: { flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 4, gap: 6 },
  wideBody: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 }, pressed: { backgroundColor: '#F8FAFC' },
  gap: { gap: 2 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameColumn: { flex: 1.4, minWidth: 0, gap: 2 }, addressColumn: { flex: 1, minWidth: 0 }, statusColumn: { width: 210 },
  title: { color: colors.primary, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 17 }, address: { color: colors.text, fontSize: 13, lineHeight: 18 },
  status: { gap: 4 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { color: '#9A3412', fontSize: 12, lineHeight: 17 },
  more: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }, moreText: { color: colors.primary, fontSize: 22, fontWeight: '700' },
  header: { backgroundColor: '#F8FAFC' }, headerText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
});

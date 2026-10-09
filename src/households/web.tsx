import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { FieldShell, useReadOnly } from '../components/ResidentControls';

// The building blocks of Tbu.Web's household wizard (evtas.css), so the device form reads like
// the web one: cards with 14 px corners, the blue +/− toggles of the trees, number steppers,
// the 80 px total boxes and the light blue "Əlavə et" rows. Touch targets stay at least 44 px.
export const web = {
  primary: '#0F62FE', text: '#1E293B', muted: '#64748B', border: '#CBD5E1', line: '#E2E8F0', surface50: '#F8FAFC',
  surface100: '#F1F5F9', disabled: '#E2E8F0', danger: '#DC2626', add: '#E7F0FF', input: '#334155',
};
/** Two columns on a tablet, as the web form's grid; one on a phone. */
export const useColumns = () => useWindowDimensions().width >= 600;

export function Card({ title, children, style }: { title?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{!!title && <Text accessibilityRole="header" style={s.cardTitle}>{title}</Text>}{children}</View>;
}
/** The 2-column field grid; `full` cells span the row. */
export function Grid({ children }: { children: ReactNode }) { return <View style={s.grid}>{children}</View>; }
export function Cell({ full, half, children }: { full?: boolean; half?: boolean; children: ReactNode }) {
  const columns = useColumns();
  return <View style={[s.cell, columns && !full && s.halfCell, columns && half && s.halfCell]}>{children}</View>;
}
export function PageTitle({ children }: { children: ReactNode }) { return <Text accessibilityRole="header" style={s.pageTitle}>{children}</Text>; }
export const LawNumber = ({ number }: { number?: string }) => number ? <Text style={s.law}> ({number})</Text> : null;

/** The blue round toggle of the web trees: a minus when open, a plus when closed. */
export function Toggle({ open }: { open: boolean }) {
  return <View style={s.toggle}><View style={s.toggleBar} />{!open && <View style={[s.toggleBar, s.toggleVertical]} />}</View>;
}
/** A read-only total, the 80 px grey box of the web tree headers. */
export function CountBox({ value, label }: { value: number | string; label: string }) {
  return <View accessibilityLabel={`${label}: ${value}`} style={s.countBox}><Text numberOfLines={1} style={s.countText}>{value}</Text></View>;
}
/** The small "i" that shows a hint, as the web tooltips do. */
export function Info({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel="Məlumat" accessibilityState={{ expanded: open }} hitSlop={14} onPress={() => setOpen(!open)} style={s.info}>
      <Text style={s.infoText}>i</Text></Pressable>
    {open && <Text accessibilityLiveRegion="polite" style={s.tooltip}>{text}</Text>}
  </View>;
}
/**
 * A tree or card header: the toggle and title on the left, an optional total box on the right.
 * `info` puts the web form's hint beside the title.
 */
export function Header({ title, number, open, onPress, total, info, bold = true, style }: {
  title: string; number?: string; open: boolean; onPress(): void; total?: ReactNode; info?: string; bold?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.header, style]}>
    <View style={s.headerTitle}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title} onPress={onPress} style={s.trigger}>
        <Toggle open={open} />
        <Text style={[s.headerText, bold && { fontWeight: '500' }]}>{title}<LawNumber number={number} /></Text>
      </Pressable>
      {!!info && <Info text={info} />}
    </View>
    {total}
  </View>;
}

const clean = (text: string, decimal: boolean) => decimal ? text.replace(/[^0-9.,]/g, '') : text.replace(/\D/g, '');
/**
 * Tbu.Web's number stepper field: the input with ▲/▼ on its right. A calculated total shows
 * no stepper and cannot be edited. Values stay as typed until the record is sent.
 */
export function Stepper({ label, number, value, onChange, decimal, calculated, required, error, hideLabel, max = 2147483647 }: {
  label: string; number?: string; value: string; onChange?(value: string): void; decimal?: boolean; calculated?: boolean;
  required?: boolean; error?: string; hideLabel?: boolean; max?: number;
}) {
  const readOnly = useReadOnly(), editable = !calculated && !!onChange && !readOnly;
  const step = (by: number) => {
    const current = Number(String(value || '0').replace(',', '.')) || 0;
    onChange?.(String(Math.min(max, Math.max(0, Math.round((current + by) * 100) / 100))));
  };
  const box = <View style={[s.numberControl, !editable && s.disabledBox, !!error && { borderColor: '#F87171' }]}>
    <TextInput accessibilityLabel={label} value={value} editable={editable} selectTextOnFocus keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      maxLength={14} placeholder="0" placeholderTextColor={web.muted} onChangeText={text => onChange?.(clean(text, !!decimal))}
      style={[s.numberInput, !editable && { color: web.muted }]} />
    {!calculated && <View style={s.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: bir vahid artır`} disabled={!editable} onPress={() => step(1)} style={s.stepButton}>
        <View style={[s.chevron, s.chevronUp]} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: bir vahid azalt`} disabled={!editable} onPress={() => step(-1)} style={[s.stepButton, s.stepDown]}>
        <View style={s.chevron} /></Pressable>
    </View>}
  </View>;
  if (hideLabel) return <View style={{ gap: 4 }}>{box}{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}</View>;
  return <FieldShell label={label} number={number} required={required} error={error}>{box}</FieldShell>;
}
/** A plain number input without a stepper, as the land areas and production fields. */
export function Amount({ label, number, value, onChange, decimal = true, calculated, error, hideLabel }: {
  label: string; number?: string; value: string; onChange?(value: string): void; decimal?: boolean; calculated?: boolean; error?: string; hideLabel?: boolean;
}) {
  const readOnly = useReadOnly(), editable = !calculated && !!onChange && !readOnly;
  const input = <TextInput accessibilityLabel={label} value={value} editable={editable} selectTextOnFocus keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
    maxLength={14} placeholder="0" placeholderTextColor={web.muted} onChangeText={text => onChange?.(clean(text, decimal))}
    style={[s.amount, !editable && s.disabledBox, !!error && { borderColor: '#F87171' }]} />;
  if (hideLabel) return <View style={{ gap: 4 }}>{input}{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}</View>;
  return <FieldShell label={label} number={number} error={error}>{input}</FieldShell>;
}

/** The web form's yes/no: two bordered boxes side by side. */
export function RadioGroup({ label, number, value, onChange, required, error, options = [[true, 'Bəli'], [false, 'Xeyr']] }: {
  label: string; number?: string; value: unknown; onChange(value: never): void; required?: boolean; error?: string;
  options?: [unknown, string][];
}) {
  const disabled = useReadOnly();
  return <FieldShell label={label} number={number} required={required} error={error}><View style={s.radios}>
    {options.map(([option, text]) => <Pressable key={String(option)} accessibilityRole="radio" accessibilityState={{ selected: value === option, disabled }} disabled={disabled}
      accessibilityLabel={`${label}: ${text}`} onPress={() => onChange(option as never)} style={[s.radio, disabled && s.disabledBox, !!error && { borderColor: '#F87171' }]}>
      <View style={[s.radioDot, value === option && s.radioOn]} /><Text style={s.radioText}>{text}</Text>
    </Pressable>)}
  </View></FieldShell>;
}
export function Checkbox({ label, number, checked, onChange, large }: { label: string; number?: string; checked: boolean; onChange(): void; large?: boolean }) {
  const disabled = useReadOnly();
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onChange} style={s.checkRow}>
    <View style={[s.check, large && { width: 21, height: 21 }, checked && s.checkOn, disabled && { opacity: 0.6 }]}>{checked && <View style={s.checkMark} />}</View>
    <Text style={[s.checkText, large && { fontSize: 16, lineHeight: 24 }]}>{label}<LawNumber number={number} /></Text>
  </Pressable>;
}

/** The light blue full-width "+ Əlavə et" of the web dynamic lists. */
export function AddRow({ label = 'Əlavə et', onPress }: { label?: string; onPress(): void }) {
  const disabled = useReadOnly();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.add, pressed && { backgroundColor: '#D9E8FF' }, disabled && { opacity: 0.5 }]}>
    <Text style={s.addText}>+  {label}</Text></Pressable>;
}
/** The red-outlined bin button of the web dynamic rows. */
export function DeleteIcon({ label, onPress }: { label: string; onPress(): void }) {
  const disabled = useReadOnly();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.delete, pressed && { backgroundColor: '#FEF2F2' }, disabled && { opacity: 0.5 }]}>
    <View style={s.binLid} /><View style={s.bin} /></Pressable>;
}
/** The pink "Sil" of the land crop rows. */
export function DeleteText({ label, onPress }: { label: string; onPress(): void }) {
  const disabled = useReadOnly();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.deleteText, pressed && { backgroundColor: '#FEE2E2' }, disabled && { opacity: 0.5 }]}>
    <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '500' }}>Sil</Text></Pressable>;
}
export function Notice({ text }: { text: string }) { return <Text accessibilityRole="alert" style={s.notice}>{text}</Text>; }
export function ErrorText({ text }: { text?: string }) { return text ? <Text accessibilityRole="alert" style={s.error}>{text}</Text> : null; }

/** Tbu.Web's .button: primary blue, secondary light grey. */
export function WebButton({ label, onPress, secondary, disabled, danger }: { label: string; onPress(): void; secondary?: boolean; disabled?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.buttonSecondary, danger && s.buttonDanger, (pressed || disabled) && { opacity: 0.6 }]}>
    <Text style={[s.buttonText, secondary && { color: '#475569' }, danger && { color: '#EF4444' }]}>{label}</Text></Pressable>;
}
/** The round icon and message of the web's empty tables. */
export function EmptyState({ message, kind }: { message: string; kind: 'member' | 'building' | 'land' }) {
  return <View accessibilityRole="text" style={s.empty}><View style={s.emptyIcon}>
    {kind === 'member' ? <><View style={s.personHead} /><View style={s.personBody} /></>
      : kind === 'building' ? <><View style={s.roof} /><View style={s.house} /></>
      : <View style={s.plot} />}
  </View><Text style={s.emptyText}>{message}</Text></View>;
}

const s = StyleSheet.create({
  card: { width: '100%', padding: 16, borderWidth: 1, borderColor: web.border, borderRadius: 14, backgroundColor: '#FFF' },
  cardTitle: { marginBottom: 20, color: web.text, fontSize: 16, fontWeight: '600', lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 24 }, cell: { width: '100%', minWidth: 0 }, halfCell: { width: '48.5%' },
  pageTitle: { color: web.text, fontSize: 16, fontWeight: '600', lineHeight: 24 },
  law: { color: web.muted, fontSize: 11, fontStyle: 'italic', fontWeight: '700' },
  toggle: { width: 20, height: 20, borderRadius: 10, backgroundColor: web.primary, alignItems: 'center', justifyContent: 'center' },
  toggleBar: { position: 'absolute', width: 10, height: 2, borderRadius: 1, backgroundColor: '#FFF' }, toggleVertical: { transform: [{ rotate: '90deg' }] },
  countBox: { width: 80, height: 32, justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: web.border, borderRadius: 6, backgroundColor: web.disabled },
  countText: { color: web.muted, fontSize: 12, textAlign: 'center' },
  info: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: web.muted, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  infoText: { color: web.muted, fontSize: 9, fontWeight: '700', lineHeight: 11 },
  tooltip: { position: 'absolute', top: 22, left: -120, zIndex: 20, width: 260, padding: 10, borderRadius: 6, backgroundColor: '#334155', color: '#FFF', fontSize: 13, lineHeight: 19, elevation: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, minHeight: 32 },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  trigger: { flexShrink: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, minHeight: 32, paddingVertical: 4 },
  headerText: { flexShrink: 1, color: web.text, fontSize: 14, lineHeight: 20, marginTop: -1 },
  numberControl: { flexDirection: 'row', height: 48, borderWidth: 1, borderColor: web.border, borderRadius: 6, backgroundColor: '#FFF', overflow: 'hidden' },
  numberInput: { flex: 1, flexBasis: 0, minWidth: 0, paddingHorizontal: 11, color: web.input, fontSize: 14 },
  disabledBox: { backgroundColor: web.disabled },
  stepper: { width: 40, borderLeftWidth: 1, borderLeftColor: web.border },
  stepButton: { flex: 1, alignItems: 'center', justifyContent: 'center' }, stepDown: { borderTopWidth: 1, borderTopColor: web.line },
  chevron: { width: 6, height: 6, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#475569', transform: [{ rotate: '45deg' }], marginTop: -3 },
  chevronUp: { transform: [{ rotate: '225deg' }], marginTop: 3 },
  amount: { height: 48, minWidth: 0, paddingHorizontal: 11, borderWidth: 1, borderColor: web.border, borderRadius: 6, backgroundColor: '#FFF', color: web.input, fontSize: 14 },
  radios: { flexDirection: 'row', gap: 8 },
  radio: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: web.line, borderRadius: 6 },
  radioDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: web.border, backgroundColor: '#FFF' },
  radioOn: { borderWidth: 6, borderColor: web.primary }, radioText: { color: web.text, fontSize: 16, lineHeight: 24 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  check: { width: 18, height: 18, borderWidth: 1, borderColor: web.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  checkOn: { backgroundColor: web.primary, borderColor: web.primary },
  checkMark: { width: 5, height: 9, borderRightWidth: 2, borderBottomWidth: 2, borderColor: '#FFF', transform: [{ rotate: '45deg' }], marginTop: -2 },
  checkText: { flex: 1, color: web.text, fontSize: 14, lineHeight: 20 },
  add: { minHeight: 44, borderRadius: 6, backgroundColor: web.add, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  addText: { color: web.primary, fontSize: 14, fontWeight: '500', textAlign: 'center' },
  delete: { width: 48, height: 48, borderWidth: 1, borderColor: '#FECACA', borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  binLid: { width: 12, height: 2, borderRadius: 1, backgroundColor: '#EF4444', marginBottom: 1 },
  bin: { width: 9, height: 10, borderWidth: 1.5, borderTopWidth: 0, borderColor: '#EF4444', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  deleteText: { minWidth: 100, minHeight: 40, borderRadius: 6, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  notice: { padding: 12, borderWidth: 1, borderColor: '#FBBF24', borderRadius: 6, backgroundColor: '#FFFBEB', color: '#92400E', fontSize: 13, lineHeight: 20 },
  error: { color: web.danger, fontSize: 12, lineHeight: 16 },
  button: { minHeight: 44, paddingHorizontal: 14, borderRadius: 6, backgroundColor: web.primary, alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: { backgroundColor: web.surface100 }, buttonDanger: { backgroundColor: '#FEF2F2' },
  buttonText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D0E2FF', alignItems: 'center', justifyContent: 'center' },
  personHead: { width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: web.primary, marginBottom: 2 },
  personBody: { width: 28, height: 13, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 2.5, borderBottomWidth: 0, borderColor: web.primary },
  roof: { width: 22, height: 22, borderLeftWidth: 2.5, borderTopWidth: 2.5, borderColor: web.primary, transform: [{ rotate: '45deg' }], marginBottom: -12 },
  house: { width: 24, height: 16, borderWidth: 2.5, borderTopWidth: 0, borderColor: web.primary },
  plot: { width: 30, height: 22, borderWidth: 2.5, borderColor: web.primary, borderRadius: 3, transform: [{ skewX: '-12deg' }] },
  emptyText: { color: web.text, fontSize: 16, fontWeight: '500', lineHeight: 24, textAlign: 'center' },
});

import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Select } from '../components/ResidentControls';
import { FieldInput } from './FieldInput';
import { numbers } from './numbers';
import { display, relationship, visibleFields } from './present';
import { displacementStatuses, documentSeries, isAzerbaijan, sections, updateMember, visible, type Errors, type Field } from './schema';
import type { FieldValue, HouseholdCatalog, HouseholdData, IdCardResult, MemberData, PersonalData } from './types';
import { AddRow, Card, Cell, Checkbox, DeleteIcon, ErrorText, Grid, LawNumber, RadioGroup, web } from './web';

/** "(999) 999-99-99" as the digits are typed, the format the server accepts. */
export function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 10);
  if (!d) return '';
  let out = `(${d.slice(0, 3)}`;
  if (d.length > 3) out += `) ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

// Tbu.Web's full-width member fields; the radios among them take half a row.
const FULL = new Set(['hasNoFin', 'finAbsenceReasonId', 'birthPlaceNote', 'isDisplaced', 'displacementStatus', 'educationInstitutionName',
  'employerName', 'positionId', 'exitReasonId', 'militaryRegistrationPlace']);

/** Tbu.Web's member form (MemberForm.cshtml) for one member of the household being edited. */
export function MemberEditor({ member, data, catalog, errors, online, serverHouseholdId, onChange, makeHead, onMakeHead, idCard }: {
  member: MemberData; data: HouseholdData; catalog: HouseholdCatalog; errors: Errors; online: boolean;
  serverHouseholdId: number | null;
  onChange(member: MemberData): void;
  /** The "make head" box as ticked on this form; it takes effect when the form is saved. */
  makeHead: boolean; onMakeHead(): void;
  idCard(householdId: number | null, fin: string, series: string, number: string): Promise<IdCardResult>;
}) {
  const [searching, setSearching] = useState(false), [searchMessage, setSearchMessage] = useState<{ error: boolean; text: string } | null>(null);
  const p = member.personal, hasHead = data.members.some(x => x.isHead);
  const set = (name: string, value: FieldValue) => onChange({ ...member, personal: updateMember(p, name, value, catalog) });
  const canSearch = online && !p.hasNoFin && /^[A-Za-z0-9]{7}$/.test(String(p.fin ?? '')) && /^[0-9]{7,8}$/.test(String(p.identityDocumentNumber ?? ''));
  async function search() {
    setSearching(true); setSearchMessage(null);
    try {
      const card = await idCard(serverHouseholdId, String(p.fin), String(p.identityDocumentSeries ?? 'AZE'), String(p.identityDocumentNumber));
      // Each value goes through the form's cascade, so a new country clears its stale address.
      let next: PersonalData = p;
      const fill = (name: string, value: FieldValue | undefined) => { if (value != null && value !== '') next = updateMember(next, name, value, catalog); };
      fill('lastName', card.lastName); fill('firstName', card.firstName); fill('fatherName', card.fatherName);
      fill('genderTypeId', card.genderTypeId); fill('birthDate', card.birthDate); fill('birthPlaceNote', card.birthPlaceNote);
      fill('birthCountryId', card.birthCountryId); fill('citizenshipCountryId', card.citizenshipCountryId);
      if (next.isRegisteredAtThisAddress === false) fill('registrationCountryId', card.registrationCountryId);
      onChange({ ...member, personal: next });
      setSearchMessage({ error: false, text: 'Şəxsiyyət vəsiqəsi məlumatları dolduruldu.' });
    } catch (cause) { setSearchMessage({ error: true, text: cause instanceof Error ? cause.message : 'Məlumat tapılmadı.' }); }
    finally { setSearching(false); }
  }
  const cell = (key: string, content: ReactNode, full = false) => <Cell key={key} full={full}>{content}</Cell>;
  function render(field: Field) {
    const value = p[field.name], number = field.kind === 'address' ? undefined : numbers.member(field.name);
    if (field.name === 'identityDocumentNumber') return null;
    if (field.kind === 'address') return isAzerbaijan(field, p, catalog) ? cell(field.name, <FieldInput field={field} data={p} catalog={catalog} errors={errors}
      set={set} setAll={personal => onChange({ ...member, personal })} />, true) : null;
    // The web form's "Seriya nömrəsi": the series list and the number in one control, with the person search beside it.
    if (field.name === 'identityDocumentSeries') return cell(field.name, <View style={{ gap: 6 }}>
      <Text style={styles.label}>Seriya nömrəsi<Text style={{ color: web.danger }}> *</Text></Text>
      <View style={styles.identity}>
        <View style={{ width: 96 }}><Select hideLabel label="Şəxsiyyət sənədinin seriyası" value={String(value ?? 'AZE')} items={documentSeries} required
          onChange={v => set(field.name, v)} /></View>
        <TextInput accessibilityLabel="Seriya nömrəsi" placeholder="Daxil edin" placeholderTextColor={web.muted} maxLength={8} keyboardType="number-pad"
          value={String(p.identityDocumentNumber ?? '')} onChangeText={v => set('identityDocumentNumber', v.replace(/\D/g, ''))}
          style={[styles.input, !!errors.identityDocumentNumber && { borderColor: '#F87171' }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Şəxsi axtar (ŞV məlumatlarını gətir)" accessibilityState={{ disabled: !canSearch || searching }}
          disabled={!canSearch || searching} onPress={() => void search()} style={[styles.search, (!canSearch || searching) && { opacity: 0.45 }]}>
          {searching ? <ActivityIndicator color="#FFF" /> : <><View style={styles.glass} /><View style={styles.glassHandle} /></>}
        </Pressable>
      </View>
      <ErrorText text={errors.identityDocumentNumber} />
      {!online && <Text style={styles.hint}>ŞV axtarışı üçün internet lazımdır. Məlumatları əl ilə daxil edə bilərsiniz; server sinxronizasiya zamanı yoxlayacaq.</Text>}
      {!!searchMessage && <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: searchMessage.error ? web.danger : '#15803D' }]}>{searchMessage.text}</Text>}
    </View>);
    if (field.name === 'hasNoFin') return cell(field.name, <Checkbox label={field.label} number={number} checked={value === true} onChange={() => set(field.name, !value)} />, true);
    if (field.name === 'displacementStatus') return cell(field.name, <RadioGroup label={field.label} number={number} required value={value}
      error={errors[field.name]} options={displacementStatuses.map(x => [x.id, x.label])} onChange={(v: number) => set(field.name, v)} />, true);
    const content = <FieldInput field={field} number={number} data={p} catalog={catalog} errors={errors} set={set} setAll={personal => onChange({ ...member, personal })} />;
    // A full-width radio takes half the row on the web form.
    return field.kind === 'boolean' && FULL.has(field.name) ? <Cell key={field.name} full><Cell half>{content}</Cell></Cell> : cell(field.name, content, FULL.has(field.name));
  }
  return <View style={{ gap: 24 }}>
    {!member.isHead && hasHead && <Text style={styles.headNote}>Bu üzvü başçı seçsəniz, digər üzvlərin qohumluq əlaqələri yenidən doldurulmalıdır.</Text>}
    {sections.map((section, index) => <Card key={section.title} title={section.title}><Grid>
      {index === 0 && !member.isHead && cell('makeHead', <Checkbox label="Bu üzvü təsərrüfat başçısı kimi təyin et" checked={makeHead} onChange={onMakeHead} />, true)}
      {section.fields.filter(field => visible(field, p, catalog)).map(render)}
      {/* Relationships are relative to the head, so they are only asked once a head exists. */}
      {index === 0 && !member.isHead && hasHead && !makeHead && cell('relationship', <Select label="Qohumluq əlaqəsi" number={numbers.member('householdRelationshipTypeId')} required
        value={p.householdRelationshipTypeId as number | null} error={errors.householdRelationshipTypeId}
        items={catalog.lookups.relationship ?? []} onChange={v => set('householdRelationshipTypeId', v)} />)}
    </Grid></Card>)}
    <Card title="Əlaqə məlumatları"><Grid>
      <Cell><ContactList label="Əlaqə telefonu" number={numbers.member('phoneNumbers')} placeholder="(999) 999-99-99" values={member.phoneNumbers}
        error={errors.phoneNumbers} phone onChange={phoneNumbers => onChange({ ...member, phoneNumbers })} /></Cell>
      <Cell><ContactList label="Elektron poçt ünvanı" number={numbers.member('emails')} placeholder="example@gmail.com" values={member.emails}
        error={errors.emails} onChange={emails => onChange({ ...member, emails })} /></Cell>
    </Grid></Card>
  </View>;
}

/** Tbu.Web's member review (MemberForm.cshtml with _ReadOnlyFormField): each field the form shows, as its label, row number and value, "-" when empty. */
export function MemberReview({ member, catalog }: { member: MemberData; catalog: HouseholdCatalog }) {
  const p = member.personal;
  const field = (key: string, label: string, value: string, number?: string, full = false) => <Cell key={key} full={full}><View style={styles.review}>
    {/* As .law-field-label: the row number sits at the label's right edge. */}
    <View style={styles.reviewLabelRow}><Text style={[styles.reviewLabel, { flex: 1 }]}>{label}</Text>{!!number && <Text style={styles.reviewNumber}>({number})</Text>}</View><Text style={styles.reviewValue}>{value.trim() || '-'}</Text></View></Cell>;
  return <View style={{ gap: 24 }}>
    {visibleFields(p, catalog).map((section, index) => <Card key={section.title} title={section.title}><Grid>
      {section.fields.map(f => field(f.name, f.label, display(f, p, catalog), f.kind === 'address' ? numbers.memberAddress(f.name) : numbers.member(f.name), f.kind === 'address' || FULL.has(f.name)))}
      {index === 0 && !member.isHead && field('relationship', 'Qohumluq əlaqəsi', relationship(member, catalog), numbers.member('householdRelationshipTypeId'))}
    </Grid></Card>)}
    <Card title="Əlaqə məlumatları"><Grid>
      {field('phoneNumbers', 'Əlaqə telefonu', member.phoneNumbers.filter(Boolean).join(', '), numbers.member('phoneNumbers'))}
      {field('emails', 'Elektron poçt ünvanı', member.emails.filter(Boolean).join(', '), numbers.member('emails'))}
    </Grid></Card>
  </View>;
}

/** The web form's contact rows: one input per value, up to ten, each removable. */
function ContactList({ label, number, placeholder, values, error, phone, onChange }: {
  label: string; number?: string; placeholder: string; values: string[]; error?: string; phone?: boolean; onChange(values: string[]): void;
}) {
  const rows = values.length ? values : [''];
  const setRow = (index: number, value: string) => onChange(rows.map((x, i) => i === index ? value : x));
  return <View style={{ gap: 6 }}>
    <Text style={styles.label}>{label}<LawNumber number={number} /></Text>
    <View style={{ gap: 20 }}>{rows.map((value, index) => <View key={index} style={styles.contactRow}>
      <TextInput accessibilityLabel={`${label} ${index + 1}`} placeholder={placeholder} placeholderTextColor={web.muted} value={value}
        keyboardType={phone ? 'phone-pad' : 'email-address'} autoCapitalize="none" maxLength={phone ? 15 : 200}
        onChangeText={v => setRow(index, phone ? formatPhone(v) : v.trim())} style={[styles.input, !!error && { borderColor: '#F87171' }]} />
      {rows.length > 1 && <DeleteIcon label={`${label} sil`} onPress={() => onChange(rows.filter((_, i) => i !== index))} />}
    </View>)}</View>
    <ErrorText text={error} />
    {rows.length < 10 && <View style={{ marginTop: 14 }}><AddRow onPress={() => onChange([...rows, ''])} /></View>}
  </View>;
}

const styles = StyleSheet.create({
  label: { color: web.text, fontSize: 14, lineHeight: 20 },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  input: { flex: 1, minWidth: 0, height: 48, paddingHorizontal: 11, borderWidth: 1, borderColor: web.border, borderRadius: 6, backgroundColor: '#FFF', color: web.input, fontSize: 14 },
  search: { width: 48, height: 48, borderRadius: 6, backgroundColor: web.primary, alignItems: 'center', justifyContent: 'center' },
  glass: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#FFF', marginTop: -3, marginLeft: -3 },
  glassHandle: { position: 'absolute', width: 2, height: 7, borderRadius: 1, backgroundColor: '#FFF', transform: [{ rotate: '-45deg' }], top: 26, left: 28 },
  hint: { color: web.muted, fontSize: 12, lineHeight: 18 },
  headNote: { color: web.muted, fontSize: 14, lineHeight: 20 },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  review: { gap: 4, paddingVertical: 6 }, reviewLabel: { color: web.muted, fontSize: 14, lineHeight: 20 },
  reviewLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, reviewNumber: { paddingLeft: 8, color: web.muted, fontSize: 11, fontStyle: 'italic', fontWeight: '700' }, reviewValue: { color: web.text, fontSize: 16, lineHeight: 24 },
});

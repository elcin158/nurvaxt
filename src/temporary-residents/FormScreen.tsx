import { type ReactNode, useDeferredValue, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, colors, FieldShell, Input, ReadOnly, Select, SidebarToggle, ui } from '../components/ResidentControls';
import { numbers } from '../households/numbers';
import { Card, Cell, Checkbox, Grid, PageTitle, RadioGroup, WebButton } from '../households/web';
import { DateField } from '../components/DateField';
import { StepMarker, type StepIconName } from '../components/StepMarker';
import { AddressFields } from './AddressFields';
import { AnimalsFields } from './AnimalsFields';
import { useResidents } from './context';
import { documentSeries, fieldOptions, firstIssue, sections, settlementStatuses, updatePersonal, validate, type Errors } from './schema';
import { draftNotice, StateBanner } from '../components/StateBanner';
import { editable, pending, type PersonalData, type ResidentData, type ResidentDraft } from './types';
const steps = ['Şəxsi hesab', 'Şəxsin məlumatları', 'Heyvanlar'];
const icons: StepIconName[] = ['account', 'person', 'animal'];
export default function FormScreen() {
  const { id, check } = useLocalSearchParams<{ id: string; check?: string }>(), residents = useResidents();
  if (residents.loading || residents.catalogLoading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ margin: 40 }} /></SafeAreaView>;
  const draft = residents.drafts.find(item => item.id === id);
  if (!draft || !residents.catalog) return <SafeAreaView style={[styles.safe, { padding: 24, gap: 20 }]}><Text style={styles.title}>{residents.error || (!residents.catalog ? 'Formanı açmaq üçün arayışları onlayn yükləyin.' : 'Qeyd tapılmadı.')}</Text><Button label="Siyahıya qayıt" onPress={() => router.replace('/temporary-residents')} /></SafeAreaView>;
  // A report known to be locked on the server opens read-only; offline the last known state decides.
  if (!editable(draft)) {
    const notice = draftNotice(draft);
    return <FormEditor key={id} initialDraft={draft} review={{ hint: 'Lokal qeyd · yalnız baxış',
      onClose: () => { router.replace('/temporary-residents'); residents.release(draft.id); },
      banner: notice && <View style={{ gap: 10 }}><StateBanner tone={notice.tone} title={notice.title} text={notice.text} />
        {!!draft.conflict && <Button secondary label="Fərqlərə bax və qərar ver" onPress={() => router.push({ pathname: '/temporary-residents/conflict/[id]', params: { id: draft.id } })} />}</View> }} />;
  }
  // Data adopted from the server remounts the editor, so it never saves its older copy over it.
  return <FormEditor key={`${id}:${draft.adoptedAt ?? ''}`} initialDraft={draft} showIssues={check === '1'} />;
}
/** Tbu.Web's review mode (?review=true): the same steps and controls, all disabled, with its own close. */
export type Review = { hint: string; banner?: ReactNode; onClose(): void };
export function FormEditor({ initialDraft, showIssues = false, review }: { initialDraft: ResidentDraft; showIssues?: boolean; review?: Review }) {
  const residents = useResidents(), { width } = useWindowDimensions(), id = initialDraft.id, readOnly = !!review;
  // The data being edited is local; the record's sync state (conflict, status, account number)
  // is read live, so a sync or decision made on another screen shows here at once.
  const [data, setData] = useState(initialDraft.data);
  const draft = residents.drafts.find(item => item.id === id) ?? initialDraft;
  // An incomplete record opened from the list starts on its first blocking step, fields marked;
  // a record just created starts clean on the first step.
  const [initialIssue] = useState(() => showIssues && residents.catalog ? firstIssue(initialDraft.data, residents.catalog) : null);
  const [step, setStep] = useState(initialIssue?.step ?? 0), [errors, setErrors] = useState<Errors>(initialIssue?.errors ?? {}), [saveError, setSaveError] = useState('');
  // The steps follow a tap at once; the step's form renders after it without blocking it, the previous one dimmed until then.
  const view = useDeferredValue(step);
  const scroll = useRef<ScrollView>(null), unsaved = useRef(false), closeRef = useRef(() => {});
  // On a tablet the step sidebar starts folded to its markers; the steps above the form on a phone are not folded.
  const [collapsed, setCollapsed] = useState(true);
  const wide = width >= 761, catalog = residents.catalog;
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!unsaved.current) { closeRef.current(); return true; }
      Alert.alert('Dəyişiklik saxlanmadı', 'Lokal yaddaşa yazmaq alınmadı. Məlumatı itirməmək üçün formada qalın.', [{ text: 'Formada qal' }]);
      return true;
    });
    return () => listener.remove();
  }, []);
  function save(next: ResidentData) {
    if (readOnly) return;
    setData(next);
    try { residents.save(id, next); setSaveError(''); unsaved.current = false; }
    catch (cause) { unsaved.current = true; setSaveError(cause instanceof Error ? cause.message : 'Məlumat cihazda saxlanmadı.'); }
  }
  function close() {
    if (review) { review.onClose(); return; }
    if (unsaved.current && data) {
      try { residents.save(id, data); unsaved.current = false; }
      catch { Alert.alert('Dəyişiklik saxlanmadı', 'Lokal yaddaşa yazmaq alınmadı. Məlumatlar hələ bu formadadır.'); return; }
    }
    router.replace('/temporary-residents');
    // A report opened from the server and left unchanged is not kept on the device.
    residents.release(id);
  }
  useEffect(() => { closeRef.current = close; });
  function next() {
    if (!data || !catalog) return;
    const issues = validate(data, catalog, step); setErrors(issues);
    if (Object.keys(issues).length) { scroll.current?.scrollTo({ y: 0, animated: true }); return; }
    if (step < 2) { setStep(step + 1); scroll.current?.scrollTo({ y: 0, animated: false }); }
    else close();
  }
  // As on the web: the account step opens the others; a report under review has it already.
  const locked = (index: number) => !readOnly && index > 0 && !data.adminUnitId;
  const completed = [!!data.adminUnitId, data.isPersonalSectionCompleted, data.isAnimalsSectionCompleted];
  if (residents.loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ margin: 40 }} /></SafeAreaView>;
  if (!catalog || !data || !draft) return <SafeAreaView style={[styles.safe, { padding: 24, gap: 20 }]}><Text style={styles.title}>{saveError || (!catalog ? 'Formanı açmaq üçün arayışları onlayn yükləyin.' : 'Qeyd tapılmadı.')}</Text><Button label="Siyahıya qayıt" onPress={close} /></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.headerTitle}>{draft.server?.personalAccountNumber ? `Təsərrüfat № ${draft.server.personalAccountNumber}` : 'Yeni müvəqqəti yaşayan şəxs'}</Text><Text style={styles.headerHint}>{review ? review.hint : `Lokal qeyd · ${residents.online ? 'Onlayn' : 'Oflayn'}`}</Text></View><Button secondary small label="✕  Bağla" onPress={close} /></View>
      <View style={[styles.body, wide && { flexDirection: 'row' }]}>
        <View style={[styles.sidebar, wide && styles.wideSidebar, wide && collapsed && styles.foldedSidebar]}><ScrollView horizontal={!wide} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.steps, wide && { flexDirection: 'column', gap: 0 }, wide && collapsed && styles.foldedSteps]}>
          {wide && <View style={[styles.toggleRow, collapsed && { alignItems: 'center', paddingHorizontal: 0 }]}><SidebarToggle collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /></View>}
          {steps.map((label, index) => <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: step === index, disabled: locked(index) }}
            disabled={locked(index)} onPress={() => { setStep(index); setErrors({}); scroll.current?.scrollTo({ y: 0, animated: false }); }} style={({ pressed }) => [styles.step, wide && styles.wideStep, wide && collapsed && styles.foldedStep, step === index && !wide && { backgroundColor: colors.pale }, pressed && { backgroundColor: colors.pale }]}>
            {/* Tbu.Web's line between the steps, in halves through each marker's centre. */}
            {wide && index > 0 && <View style={[styles.connector, styles.upper, collapsed && styles.foldedConnector, step !== index - 1 && completed[index - 1] && styles.connectorDone]} />}
            {wide && index < steps.length - 1 && <View style={[styles.connector, styles.lower, collapsed && styles.foldedConnector, step !== index && completed[index] && styles.connectorDone]} />}
            <StepMarker icon={icons[index]} active={step === index} done={completed[index]} />
            {!(wide && collapsed) && <Text style={[styles.stepText, step === index && { color: colors.primary, fontWeight: '600' }]}>{label}</Text>}
          </Pressable>)}
        </ScrollView></View>
        <View style={styles.content}>
          <ReadOnly value={readOnly}><ScrollView ref={scroll} style={styles.flex} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.form, wide && { padding: 32 }]}>
            <View style={[styles.formInner, view === 0 && { maxWidth: 554 }, view !== step && { opacity: 0.5 }]}><PageTitle>{steps[view]}</PageTitle>
              {review ? review.banner : (() => { const notice = draftNotice(draft); return notice && <View style={{ gap: 10 }}><StateBanner tone={notice.tone} title={notice.title} text={notice.text} />
                {!!draft.conflict && <Button secondary label="Fərqlərə bax və qərar ver" onPress={() => router.push({ pathname: '/temporary-residents/conflict/[id]', params: { id: draft.id } })} />}</View>; })()}
              {!review && !!draft.server && !pending(draft) && !draft.conflict && <StateBanner tone="info" title="Dəyişiklik etmədən çıxsanız, qeyd cihazdan silinəcək."
                text="Hesabat serverdə qalır; lazım olsa, «Serverdə» tabından yenidən aça bilərsiniz." />}
              {!!saveError && <Text accessibilityRole="alert" style={styles.error}>{saveError} Dəyişiklik hələ yadda saxlanmayıb.</Text>}
              {!!Object.keys(errors).length && <Text accessibilityRole="alert" style={styles.error}>{Object.values(errors).join('\n')}</Text>}
              {view === 0 && <View style={styles.account}>
                <View style={styles.summary}><Text style={styles.muted}>Hesabat ili</Text><Text style={styles.summaryValue}>{data.reportYear}</Text></View>
                {!!draft.server?.personalAccountNumber && <View style={styles.summary}><Text style={styles.muted}>Şəxsi hesab №</Text><Text style={styles.summaryValue}>{draft.server.personalAccountNumber}</Text></View>}
                <AddressFields data={data as unknown as PersonalData} catalog={catalog} errors={errors} onChange={value => save({ ...data,
                  adminUnitId: value.adminUnitId as number | null, throughFareId: value.throughFareId as number | null, entranceId: value.entranceId as number | null,
                  addressIsOther: value.addressIsOther === true, addressOtherNote: String(value.addressOtherNote ?? '') })} />
              </View>}
              {view === 1 && <>
                {sections.map(section => <Card key={section.title} title={section.title}><Grid>
                  {section.fields.filter(field => field.name !== 'identityDocumentNumber' && (!field.when || field.when(data.personal, catalog))).map(field => {
                    const value = data.personal[field.name], number = numbers.temporary(field.name);
                    const set = (v: string | number | boolean | null) => save({ ...data, personal: updatePersonal(data.personal, field.name, v, catalog) });
                    if (field.kind === 'address' && catalog.lookups.country?.find(x => x.id === data.personal[`${field.name}CountryId`])?.code !== '031') return null;
                    return <Cell key={field.name} full={field.full}>
                      {/* Tbu.Web's identity document: the series list and the number side by side under one label. */}
                      {field.name === 'identityDocumentSeries' ? <FieldShell label="Seriya nömrəsi" required error={errors.identityDocumentNumber}><View style={styles.identity}>
                        <View style={{ width: 96 }}><Select hideLabel label="Şəxsiyyət sənədinin seriyası" value={String(value ?? 'AZE')} items={documentSeries} required onChange={set} /></View>
                        <TextInput accessibilityLabel="Seriya nömrəsi" maxLength={8} keyboardType="number-pad" value={String(data.personal.identityDocumentNumber ?? '')}
                          editable={!readOnly} placeholder={readOnly ? undefined : 'Daxil edin'} placeholderTextColor={colors.muted}
                          onChangeText={v => save({ ...data, personal: updatePersonal(data.personal, 'identityDocumentNumber', v.replace(/\D/g, ''), catalog) })}
                          style={[ui.input, styles.flex, !!errors.identityDocumentNumber && { borderColor: '#DC2626' }, readOnly && ui.selectDisabled]} />
                      </View></FieldShell> : field.kind === 'address' ? <AddressFields prefix={field.name} label={field.label} number={number} data={data.personal} catalog={catalog} errors={errors} onChange={personal => save({ ...data, personal })} />
                        : field.name === 'hasNoFin' ? <Checkbox label={field.label} number={number} checked={value === true} onChange={() => set(!value)} />
                        : field.kind === 'boolean' ? <RadioGroup label={field.label} number={number} required={field.required} error={errors[field.name]} value={value} onChange={(v: boolean) => set(v)} />
                        : field.kind === 'select' ? <Select label={field.label} number={number} value={value as string | number | null} required={field.required} error={errors[field.name]}
                          items={field.lookup === 'documentSeries' ? documentSeries : field.lookup === 'settlementStatus' ? settlementStatuses : fieldOptions(field, data.personal, catalog)} onChange={set} />
                        : field.kind === 'date' ? <DateField label={field.label} number={number} value={String(value ?? '')} required={field.required} error={errors[field.name]} onChange={set} />
                        : <Input label={field.label} number={number} required={field.required} error={errors[field.name]} value={String(value ?? '')} maxLength={field.maxLength}
                          placeholder="Daxil edin" autoCapitalize={field.name === 'fin' ? 'characters' : 'sentences'}
                          onChangeText={v => set(field.name === 'fin' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '') : v)} />}
                    </Cell>;
                  })}
                </Grid></Card>)}
                <View style={styles.consent}><Checkbox label="Bu bölmə üzrə məlumatların daxil edilməsini bitirdim" checked={data.isPersonalSectionCompleted} onChange={() => {
                  if (!data.isPersonalSectionCompleted) { const issues = validate(data, catalog, 1); setErrors(issues); if (Object.keys(issues).length) { scroll.current?.scrollTo({ y: 0 }); return; } }
                  save({ ...data, isPersonalSectionCompleted: !data.isPersonalSectionCompleted });
                }} /></View>
              </>}
              {view === 2 && <><AnimalsFields data={data} catalog={catalog} onChange={save} /><View style={styles.consent}><Checkbox label="Bu bölmə üzrə məlumatların daxil edilməsini bitirdim" checked={data.isAnimalsSectionCompleted} onChange={() => save({ ...data, isAnimalsSectionCompleted: !data.isAnimalsSectionCompleted })} /></View></>}
            </View>
          </ScrollView></ReadOnly>
          <View style={styles.footer}><View style={styles.footerLeft}>{step > 0 && <WebButton secondary label="← Geri" onPress={() => { setStep(step - 1); setErrors({}); scroll.current?.scrollTo({ y: 0, animated: false }); }} />}
            {!readOnly && <Text accessibilityLiveRegion="polite" style={[styles.saved, saveError && { color: '#B91C1C' }]}>{saveError ? 'Saxlanmadı' : '✓ Cihazda saxlanıldı'}</Text>}</View>
            {/* Under review the last step has no action, as on the web: only "Geri" and the header's close. */}
            {readOnly ? step < 2 && <WebButton label="Növbəti →" onPress={() => { setStep(step + 1); scroll.current?.scrollTo({ y: 0, animated: false }); }} />
              : <WebButton label={step < 2 ? 'Növbəti →' : 'Yadda saxla və bağla'} onPress={next} />}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#FFF' }, header: { minHeight: 80, borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, headerTitle: { color: colors.text, fontSize: 16, fontWeight: '500', lineHeight: 24 }, headerHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  body: { flex: 1 }, sidebar: { borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#FFF' }, wideSidebar: { width: 224, paddingVertical: 24, borderBottomWidth: 0, borderRightWidth: 1, borderRightColor: colors.line }, steps: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 }, step: { flexDirection: 'row', gap: 10, padding: 8, minHeight: 56, width: 152, alignItems: 'center', borderRadius: 6 }, wideStep: { width: 192, minHeight: 84, paddingHorizontal: 8 },
  connector: { position: 'absolute', left: 25.5, width: 1, backgroundColor: colors.line }, upper: { top: 0, height: '50%' }, lower: { top: '50%', bottom: 0 },
  foldedConnector: { left: 35.5 }, connectorDone: { backgroundColor: colors.primary }, foldedSidebar: { width: 72 }, foldedSteps: { paddingHorizontal: 0, gap: 0 },
  // Folded, each step is a full-width 72 × 84 target, not just its marker.
  foldedStep: { width: 72, minHeight: 84, paddingHorizontal: 0, justifyContent: 'center', borderRadius: 0 }, toggleRow: { paddingHorizontal: 6, marginBottom: 20 }, stepText: { fontSize: 13, color: colors.text, lineHeight: 20, flex: 1 },
  content: { flex: 1, backgroundColor: '#FFF' }, form: { padding: 20, alignItems: 'center' }, formInner: { width: '100%', maxWidth: 820, gap: 24 }, identity: { flexDirection: 'row', gap: 4 }, consent: { marginTop: -4 }, title: { color: colors.text, fontSize: 22, lineHeight: 30, fontWeight: '600' }, account: { gap: 16 }, summary: { gap: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, muted: { color: colors.muted, fontSize: 14 }, summaryValue: { color: colors.text, fontSize: 16, lineHeight: 24 },
  footer: { borderTopWidth: 1, borderTopColor: colors.line, padding: 16, gap: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }, footerLeft: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 }, saved: { color: '#15803D', fontSize: 12 }, error: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 12, borderRadius: 6, lineHeight: 22 },
});

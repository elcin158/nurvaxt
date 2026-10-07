import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { BooleanField, Button, Check, colors, Input, Select } from '../components/ResidentControls';
import { DateField } from '../components/DateField';
import { AddressFields } from './AddressFields';
import { AnimalsFields } from './AnimalsFields';
import { useResidents } from './context';
import { documentSeries, fieldOptions, firstIssue, sections, settlementStatuses, updatePersonal, validate, type Errors } from './schema';
import { draftNotice, StateBanner } from './StateBanner';
import { ResidentView } from './ResidentView';
import { editable, type PersonalData, type ResidentData, type ResidentDraft } from './types';
const steps = ['Şəxsi hesab', 'Şəxsin məlumatları', 'Heyvanlar'];
export default function FormScreen() {
  const { id, check } = useLocalSearchParams<{ id: string; check?: string }>(), residents = useResidents();
  if (residents.loading || residents.catalogLoading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ margin: 40 }} /></SafeAreaView>;
  const draft = residents.drafts.find(item => item.id === id);
  if (!draft || !residents.catalog) return <SafeAreaView style={[styles.safe, { padding: 24, gap: 20 }]}><Text style={styles.title}>{residents.error || (!residents.catalog ? 'Formanı açmaq üçün arayışları onlayn yükləyin.' : 'Qeyd tapılmadı.')}</Text><Button label="Siyahıya qayıt" onPress={() => router.replace('/temporary-residents')} /></SafeAreaView>;
  // A report known to be locked on the server opens read-only; offline the last known state decides.
  if (!editable(draft)) {
    const notice = draftNotice(draft);
    return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
      <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.headerTitle}>{draft.server?.personalAccountNumber ? `Təsərrüfat № ${draft.server.personalAccountNumber}` : 'Müvəqqəti yaşayan şəxs'}</Text>
        <Text style={styles.headerHint}>Lokal qeyd · yalnız baxış</Text></View><Button secondary small label="✕  Bağla" onPress={() => router.replace('/temporary-residents')} /></View>
      <ResidentView data={draft.data} accountNumber={draft.server?.personalAccountNumber} catalog={residents.catalog}
        banner={notice && <View style={{ gap: 10 }}><StateBanner tone={notice.tone} title={notice.title} text={notice.text} />
          {!!draft.conflict && <Button secondary label="Fərqlərə bax və qərar ver" onPress={() => router.push({ pathname: '/temporary-residents/conflict/[id]', params: { id: draft.id } })} />}</View>} />
    </SafeAreaView>;
  }
  // Data adopted from the server remounts the editor, so it never saves its older copy over it.
  return <FormEditor key={`${id}:${draft.adoptedAt ?? ''}`} id={id} initialDraft={draft} showIssues={check === '1'} />;
}
function FormEditor({ id, initialDraft, showIssues }: { id: string; initialDraft: ResidentDraft; showIssues: boolean }) {
  const residents = useResidents(), { width } = useWindowDimensions();
  // The data being edited is local; the record's sync state (conflict, status, account number)
  // is read live, so a sync or decision made on another screen shows here at once.
  const [data, setData] = useState(initialDraft.data);
  const draft = residents.drafts.find(item => item.id === id) ?? initialDraft;
  // An incomplete record opened from the list starts on its first blocking step, fields marked;
  // a record just created starts clean on the first step.
  const [initialIssue] = useState(() => showIssues && residents.catalog ? firstIssue(initialDraft.data, residents.catalog) : null);
  const [step, setStep] = useState(initialIssue?.step ?? 0), [errors, setErrors] = useState<Errors>(initialIssue?.errors ?? {}), [saveError, setSaveError] = useState('');
  const scroll = useRef<ScrollView>(null), unsaved = useRef(false);
  const wide = width >= 761, twoColumns = width >= 1000, catalog = residents.catalog;
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!unsaved.current) return false;
      Alert.alert('Dəyişiklik saxlanmadı', 'Lokal yaddaşa yazmaq alınmadı. Məlumatı itirməmək üçün formada qalın.', [{ text: 'Formada qal' }]);
      return true;
    });
    return () => listener.remove();
  }, []);
  function save(next: ResidentData) {
    setData(next);
    try { residents.save(id, next); setSaveError(''); unsaved.current = false; }
    catch (cause) { unsaved.current = true; setSaveError(cause instanceof Error ? cause.message : 'Məlumat cihazda saxlanmadı.'); }
  }
  function close() {
    if (unsaved.current && data) {
      try { residents.save(id, data); unsaved.current = false; }
      catch { Alert.alert('Dəyişiklik saxlanmadı', 'Lokal yaddaşa yazmaq alınmadı. Məlumatlar hələ bu formadadır.'); return; }
    }
    router.replace('/temporary-residents');
  }
  function next() {
    if (!data || !catalog) return;
    const issues = validate(data, catalog, step); setErrors(issues);
    if (Object.keys(issues).length) { scroll.current?.scrollTo({ y: 0, animated: true }); return; }
    if (step < 2) { setStep(step + 1); scroll.current?.scrollTo({ y: 0, animated: false }); }
    else close();
  }
  if (residents.loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ margin: 40 }} /></SafeAreaView>;
  if (!catalog || !data || !draft) return <SafeAreaView style={[styles.safe, { padding: 24, gap: 20 }]}><Text style={styles.title}>{saveError || (!catalog ? 'Formanı açmaq üçün arayışları onlayn yükləyin.' : 'Qeyd tapılmadı.')}</Text><Button label="Siyahıya qayıt" onPress={close} /></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.headerTitle}>{draft.server?.personalAccountNumber ? `Təsərrüfat № ${draft.server.personalAccountNumber}` : 'Yeni müvəqqəti yaşayan şəxs'}</Text><Text style={styles.headerHint}>Lokal qeyd · {residents.online ? 'Onlayn' : 'Oflayn'}</Text></View><Button secondary small label="✕  Bağla" onPress={close} /></View>
      <View style={[styles.body, wide && { flexDirection: 'row' }]}>
        <View style={[styles.sidebar, wide && styles.wideSidebar]}><ScrollView horizontal={!wide} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.steps, wide && { flexDirection: 'column' }]}>
          {steps.map((label, index) => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: step === index, disabled: index > 0 && !data.adminUnitId }}
            disabled={index > 0 && !data.adminUnitId} onPress={() => { setStep(index); setErrors({}); scroll.current?.scrollTo({ y: 0, animated: false }); }} style={[styles.step, wide && styles.wideStep, step === index && !wide && { backgroundColor: colors.pale }]}>
            <View style={[styles.marker, step === index && styles.activeMarker]}><Text style={[styles.markerText, step === index && { color: '#FFF' }]}>{index + 1}</Text></View><Text style={[styles.stepText, step === index && { color: colors.primary, fontWeight: '600' }]}>{label}</Text>
          </Pressable>)}
        </ScrollView></View>
        <View style={styles.content}>
          <ScrollView ref={scroll} style={styles.flex} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.form, wide && { padding: 32 }]}>
            <View style={[styles.formInner, step === 0 && { maxWidth: 554 }]}><Text style={styles.title}>{steps[step]}</Text>
              {(() => { const notice = draftNotice(draft); return notice && <View style={{ gap: 10 }}><StateBanner tone={notice.tone} title={notice.title} text={notice.text} />
                {!!draft.conflict && <Button secondary label="Fərqlərə bax və qərar ver" onPress={() => router.push({ pathname: '/temporary-residents/conflict/[id]', params: { id: draft.id } })} />}</View>; })()}
              {!!saveError && <Text accessibilityRole="alert" style={styles.error}>{saveError} Dəyişiklik hələ yadda saxlanmayıb.</Text>}
              {!!Object.keys(errors).length && <Text accessibilityRole="alert" style={styles.error}>{Object.values(errors).join('\n')}</Text>}
              {step === 0 && <View style={styles.account}>
                <View style={styles.summary}><Text style={styles.muted}>Hesabat ili</Text><Text style={styles.summaryValue}>{data.reportYear}</Text></View>
                <View style={styles.summary}><Text style={styles.muted}>Şəxsi hesab №</Text><Text style={styles.summaryValue}>{draft.server?.personalAccountNumber || 'Sinxronizasiyadan sonra veriləcək'}</Text></View>
                <AddressFields data={data as unknown as PersonalData} catalog={catalog} errors={errors} onChange={value => save({ ...data,
                  adminUnitId: value.adminUnitId as number | null, throughFareId: value.throughFareId as number | null, entranceId: value.entranceId as number | null,
                  addressIsOther: value.addressIsOther === true, addressOtherNote: String(value.addressOtherNote ?? '') })} />
              </View>}
              {step === 1 && <>
                {sections.map(section => <View key={section.title} style={styles.section}><Text style={styles.sectionTitle}>{section.title}</Text><View style={styles.grid}>
                  {section.fields.filter(field => field.name !== 'identityDocumentNumber' && (!field.when || field.when(data.personal, catalog))).map(field => {
                    const value = data.personal[field.name];
                    if (field.kind === 'address' && catalog.lookups.country?.find(x => x.id === data.personal[`${field.name}CountryId`])?.code !== '031') return null;
                    return <View key={field.name} style={[styles.cell, twoColumns && !field.full && { width: '48%' }]}>
                      {field.name === 'identityDocumentSeries' ? <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ width: 104 }}><Select label="Seriya" value={String(value ?? 'AZE')} items={documentSeries} required
                          onChange={v => save({ ...data, personal: updatePersonal(data.personal, field.name, v, catalog) })} /></View>
                        <View style={{ flex: 1 }}><Input label="Seriya nömrəsi" required maxLength={8} keyboardType="number-pad" value={String(data.personal.identityDocumentNumber ?? '')} error={errors.identityDocumentNumber}
                          onChangeText={v => save({ ...data, personal: updatePersonal(data.personal, 'identityDocumentNumber', v.replace(/\D/g, ''), catalog) })} /></View>
                      </View> : field.kind === 'address' ? <AddressFields prefix={field.name} label={field.label} data={data.personal} catalog={catalog} errors={errors} onChange={personal => save({ ...data, personal })} />
                        : field.name === 'hasNoFin' ? <Check label={field.label} checked={value === true} onChange={() => save({ ...data, personal: updatePersonal(data.personal, field.name, !value, catalog) })} />
                        : field.kind === 'boolean' ? <BooleanField label={field.label} required={field.required} error={errors[field.name]} value={value as boolean | null} onChange={v => save({ ...data, personal: updatePersonal(data.personal, field.name, v, catalog) })} />
                        : field.kind === 'select' ? <Select label={field.label} value={value as string | number | null} required={field.required} error={errors[field.name]}
                          items={field.lookup === 'documentSeries' ? documentSeries : field.lookup === 'settlementStatus' ? settlementStatuses : fieldOptions(field, data.personal, catalog)}
                          onChange={v => save({ ...data, personal: updatePersonal(data.personal, field.name, v, catalog) })} />
                        : field.kind === 'date' ? <DateField label={field.label} value={String(value ?? '')} required={field.required} error={errors[field.name]}
                          onChange={v => save({ ...data, personal: updatePersonal(data.personal, field.name, v, catalog) })} />
                        : <Input label={field.label} required={field.required} error={errors[field.name]} value={String(value ?? '')} maxLength={field.maxLength}
                          placeholder="Daxil edin" autoCapitalize={field.name === 'fin' ? 'characters' : 'sentences'}
                          keyboardType={field.name === 'identityDocumentNumber' ? 'number-pad' : 'default'}
                          onChangeText={v => save({ ...data, personal: updatePersonal(data.personal, field.name, field.name === 'fin' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '') : v, catalog) })} />}
                    </View>;
                  })}
                </View></View>)}
                <Check label="Bu bölmə üzrə məlumatların daxil edilməsini bitirdim" checked={data.isPersonalSectionCompleted} onChange={() => {
                  if (!data.isPersonalSectionCompleted) { const issues = validate(data, catalog, 1); setErrors(issues); if (Object.keys(issues).length) { scroll.current?.scrollTo({ y: 0 }); return; } }
                  save({ ...data, isPersonalSectionCompleted: !data.isPersonalSectionCompleted });
                }} />
              </>}
              {step === 2 && <><AnimalsFields data={data} catalog={catalog} onChange={save} /><Check label="Bu bölmə üzrə məlumatların daxil edilməsini bitirdim" checked={data.isAnimalsSectionCompleted} onChange={() => save({ ...data, isAnimalsSectionCompleted: !data.isAnimalsSectionCompleted })} /></>}
            </View>
          </ScrollView>
          <View style={styles.footer}><View style={styles.footerLeft}>{step > 0 && <Button secondary label="← Geri" onPress={() => { setStep(step - 1); setErrors({}); scroll.current?.scrollTo({ y: 0, animated: false }); }} />}
            <Text accessibilityLiveRegion="polite" style={[styles.saved, saveError && { color: '#B91C1C' }]}>{saveError ? 'Saxlanmadı' : '✓ Cihazda saxlanıldı'}</Text></View>
            <Button label={step < 2 ? 'Növbəti →' : 'Yadda saxla və bağla'} onPress={next} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#FFF' }, header: { minHeight: 80, borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, headerTitle: { color: colors.text, fontSize: 16, fontWeight: '500', lineHeight: 24 }, headerHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  body: { flex: 1 }, sidebar: { borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#FFF' }, wideSidebar: { width: 224, paddingVertical: 24, borderBottomWidth: 0, borderRightWidth: 1, borderRightColor: colors.line }, steps: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 }, step: { flexDirection: 'row', gap: 10, padding: 8, minHeight: 56, width: 152, alignItems: 'center', borderRadius: 6 }, wideStep: { width: 192, paddingHorizontal: 8, marginBottom: 28 }, marker: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, activeMarker: { borderColor: '#83AEFF', backgroundColor: colors.primary, borderWidth: 3 }, markerText: { fontSize: 11, color: colors.muted }, stepText: { fontSize: 13, color: colors.text, lineHeight: 20, flex: 1 },
  content: { flex: 1, backgroundColor: '#FFF' }, form: { padding: 20, alignItems: 'center' }, formInner: { width: '100%', maxWidth: 820, gap: 24 }, title: { color: colors.text, fontSize: 22, lineHeight: 30, fontWeight: '600' }, account: { gap: 24 }, summary: { gap: 6, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line }, muted: { color: colors.muted, fontSize: 14 }, summaryValue: { color: colors.text, fontSize: 16 },
  section: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, overflow: 'hidden' }, sectionTitle: { backgroundColor: '#F8FAFC', color: colors.text, fontSize: 15, fontWeight: '600', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }, grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 }, cell: { width: '100%' }, footer: { borderTopWidth: 1, borderTopColor: colors.line, padding: 16, gap: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }, footerLeft: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 }, saved: { color: '#15803D', fontSize: 12 }, error: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 12, borderRadius: 6, lineHeight: 22 },
});

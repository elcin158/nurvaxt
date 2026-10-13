import { type ReactNode, useDeferredValue, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, colors, ReadOnly, SidebarToggle, useReadOnly } from '../components/ResidentControls';
import { ActionSheet, ConfirmDialog } from '../components/ActionSheet';
import { draftNotice, StateBanner } from '../components/StateBanner';
import { AddressFields } from '../temporary-residents/AddressFields';
import { StepMarker, type StepIconName } from '../components/StepMarker';
import { useHouseholds } from './context';
import { MemberEditor, MemberReview } from './MemberEditor';
import { accountAddress, relationship } from './present';
import { relationshipsComplete, validateMember, type Errors } from './schema';
import { BuildingEditor, landArea, LandEditor, LivestockStep, VehiclesStep } from './StepEditors';
import { firstIssue, STEPS, validate, validateBuilding, validateLand } from './steps';
import { editable, memberName, pending, newBuilding, newLand, newMember, type HouseholdData, type HouseholdDraft, type MemberData, type PersonalData } from './types';
import { Checkbox, EmptyState, Info, Notice, PageTitle, WebButton, web } from './web';
import { householdSteps } from './history';
import { useStepHistory } from '../history/useStepHistory';
import { LocationGate } from '../location/LocationGate';
import { gpsLabel, useGps } from '../location/gps';

const SUBJECT = 'Təsərrüfat';
export default function FormScreen() {
  const { id, check } = useLocalSearchParams<{ id: string; check?: string }>(), households = useHouseholds();
  if (households.loading || households.catalogLoading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ margin: 40 }} /></SafeAreaView>;
  const draft = households.drafts.find(item => item.id === id);
  if (!draft || !households.catalog) return <SafeAreaView style={[styles.safe, { padding: 24, gap: 20 }]}><Text style={styles.title}>{households.error || (!households.catalog ? 'Formanı açmaq üçün arayışları onlayn yükləyin.' : 'Qeyd tapılmadı.')}</Text><Button label="Siyahıya qayıt" onPress={() => router.replace('/households')} /></SafeAreaView>;
  // A household known to be locked on the server opens read-only; offline the last known state decides.
  if (!editable(draft)) {
    const notice = draftNotice(draft, SUBJECT);
    return <FormEditor key={id} initialDraft={draft} review={{ hint: 'Lokal qeyd · yalnız baxış',
      onClose: () => { router.replace('/households'); households.release(draft.id); },
      banner: notice && <View style={{ gap: 10 }}><StateBanner tone={notice.tone} title={notice.title} text={notice.text} />
        {!!draft.conflict && <Button secondary label="Fərqlərə bax və qərar ver" onPress={() => router.push({ pathname: '/households/conflict/[id]', params: { id: draft.id } })} />}</View> }} />;
  }
  // Data adopted from the server remounts the editor, so it never saves its older copy over it.
  // Every step save is recorded with a GPS position, so editing needs precise location first.
  return <LocationGate onCancel={() => { router.replace('/households'); households.release(draft.id); }}>
    <FormEditor key={`${id}:${draft.adoptedAt ?? ''}`} initialDraft={draft} showIssues={check === '1'} />
  </LocationGate>;
}
/** Tbu.Web's review mode (?review=true): the same steps and controls, all disabled, with its own close. */
export type Review = { hint: string; banner?: ReactNode; address?: string | null; onClose(): void };
type Kind = 'member' | 'building' | 'land';
/**
 * The member, building or land being edited, by device key. `snapshot` is its state when opened; `isNew` one just added.
 * `makeHead` is the member form's "Bu üzvü təsərrüfat başçısı kimi təyin et": as on the web it is a field of the
 * form, ticked and unticked freely, and the member becomes the head only when the form is saved.
 */
type Editing = { kind: Kind; key: string; isNew: boolean; snapshot: string; makeHead?: boolean } | null;
const RECORDS = { member: 'members', building: 'buildings', land: 'lands' } as const;
const COMPLETION = { members: 'isMembersSectionCompleted', buildings: 'isBuildingsSectionCompleted', lands: 'isLandsSectionCompleted' } as const;
// The step page headings of Tbu.Web (WizardStepDescriptions), also shown in the step hints.
const DESCRIPTIONS = [null, 'Təsərrüfat üzvlərinin siyahısı',
  'Təsərrüfatın xüsusi mülkiyyətində və (və ya) istifadəsində olan tikililər',
  'Təsərrüfatın xüsusi mülkiyyətində və (və ya) istifadəsində olan avtonəqliyyat vasitələri və kənd təsərrüfatı texnikası',
  'Təsərrüfatın xüsusi mülkiyyətində və (və ya) istifadəsində olan torpaq',
  'Təsərrüfatın xüsusi mülkiyyətində olan heyvanların, quşların və arı ailələrinin sayı'];
const DONE = 'Bu bölmə üzrə məlumatların daxil edilməsini bitirdim';
const ICONS: StepIconName[] = ['account', 'members', 'building', 'vehicle', 'land', 'animal'];

export function FormEditor({ initialDraft, showIssues = false, review }: { initialDraft: HouseholdDraft; showIssues?: boolean; review?: Review }) {
  const households = useHouseholds(), { width } = useWindowDimensions(), id = initialDraft.id, readOnly = !!review;
  // The data being edited is local; the record's sync state (conflict, status, account number)
  // is read live, so a sync or decision made on another screen shows here at once.
  const [data, setData] = useState(initialDraft.data);
  const draft = households.drafts.find(item => item.id === id) ?? initialDraft;
  const [initialIssue] = useState(() => showIssues && households.catalog ? firstIssue(initialDraft.data, households.catalog) : null);
  const [step, setStep] = useState(initialIssue?.step ?? 0), [errors, setErrors] = useState<Errors>(initialIssue?.errors ?? {}), [saveError, setSaveError] = useState('');
  // The sidebar follows a tap at once; the step's form, which may hold a hundred inputs, renders after it
  // without blocking it, the previous one staying (dimmed) until then.
  const view = useDeferredValue(step);
  const [editing, setEditing] = useState<Editing>(null), [recordErrors, setRecordErrors] = useState<Errors>({});
  const [menu, setMenu] = useState<{ kind: Kind; key: string; title: string; removable: boolean } | null>(null);
  const [removing, setRemoving] = useState<{ kind: Kind; key: string; title: string } | null>(null);
  const [makingHead, setMakingHead] = useState<MemberData | null>(null);
  const scroll = useRef<ScrollView>(null), unsaved = useRef(false), backRef = useRef<() => boolean>(() => false);
  const wide = width >= 761, catalog = households.catalog;
  const gps = useGps(!readOnly, households.maxAccuracy);
  const checkpoint = useStepHistory({ enabled: !readOnly, data, diff: householdSteps, location: gps.current,
    record: (changes, location) => households.record(id, changes, location),
    unconfirmed: () => { const saved = households.store?.get(id); return !!saved && pending(saved) && !saved.events?.length; } });
  // Leaving a step or a member, building or land form is the web's "Yadda saxla": what changed becomes history entries.
  // Opening a record form is not: a record added and left untouched is dropped, as the web never created it.
  const shown = useRef<{ step: number; record: string | null }>({ step, record: null });
  useEffect(() => {
    const before = shown.current, record = editing?.key ?? null;
    shown.current = { step, record };
    if (before.step !== step || before.record && before.record !== record) checkpoint();
  });
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => backRef.current());
    return () => listener.remove();
  }, []);
  function save(next: HouseholdData) {
    if (readOnly) return;
    setData(next);
    try { households.save(id, next); setSaveError(''); unsaved.current = false; }
    catch (cause) { unsaved.current = true; setSaveError(cause instanceof Error ? cause.message : 'Məlumat cihazda saxlanmadı.'); }
  }
  function close() {
    if (review) { review.onClose(); return; }
    if (unsaved.current) {
      try { households.save(id, data); unsaved.current = false; }
      catch { Alert.alert('Dəyişiklik saxlanmadı', 'Lokal yaddaşa yazmaq alınmadı. Məlumatlar hələ bu formadadır.'); return; }
    }
    checkpoint(true);
    router.replace('/households');
    // A household opened from the server and left unchanged is not kept on the device.
    households.release(id);
  }
  const top = () => scroll.current?.scrollTo({ y: 0, animated: false });
  const list = (kind: Kind) => data[RECORDS[kind]] as { key: string }[];
  function replace<K extends 'members' | 'buildings' | 'lands'>(key: K, item: HouseholdData[K][number]) {
    save({ ...data, [key]: (data[key] as { key: string }[]).map(x => x.key === item.key ? item : x) });
  }
  // A record added or removed reopens its section, as a change on the web form unticks "bitirdim".
  function addRecord(kind: Kind) {
    const key = households.newKey();
    const item = kind === 'member' ? newMember(key, false) : kind === 'building' ? newBuilding(key) : newLand(key);
    save({ ...data, [RECORDS[kind]]: [...list(kind), item], [COMPLETION[RECORDS[kind]]]: false });
    setEditing({ kind, key, isNew: true, snapshot: JSON.stringify(item) }); setRecordErrors({}); top();
  }
  // As on the server: a new head clears every other member's relationship and reopens the section.
  const withHead = (source: HouseholdData, key: string): HouseholdData => ({ ...source, isMembersSectionCompleted: false, members: source.members.map(x => x.key === key
    ? { ...x, isHead: true, personal: { ...x.personal, householdRelationshipTypeId: null } }
    : { ...x, isHead: false, personal: { ...x.personal, householdRelationshipTypeId: null } }) });
  function recordIssues(target: NonNullable<Editing>): Errors {
    if (!catalog) return {};
    // A member about to become the head is checked as the head, so no relationship is asked of it.
    if (target.kind === 'member') {
      const source = target.makeHead ? withHead(data, target.key) : data, m = source.members.find(x => x.key === target.key);
      return m ? validateMember(m, source, catalog) : {};
    }
    if (target.kind === 'building') { const b = data.buildings.find(x => x.key === target.key); return b ? validateBuilding(b, catalog) : {}; }
    const l = data.lands.find(x => x.key === target.key); return l ? validateLand(l, catalog) : {};
  }
  /** "Əlavə et" / "Yadda saxla" of the record form: back to the list once the record is valid. */
  function submitRecord() {
    if (!editing) return;
    const issues = recordIssues(editing);
    if (Object.keys(issues).length) { setRecordErrors(issues); top(); return; }
    if (editing.makeHead) save(withHead(data, editing.key));
    setEditing(null); setRecordErrors({}); setErrors({}); top();
  }
  /** The form's ×: back to the list; a record just added and left untouched is dropped, as the web form never created it. */
  function dismissRecord() {
    if (!editing) return;
    const item = list(editing.kind).find(x => x.key === editing.key);
    if (editing.isNew && item && JSON.stringify(item) === editing.snapshot)
      save({ ...data, [RECORDS[editing.kind]]: list(editing.kind).filter(x => x.key !== editing.key) });
    setEditing(null); setRecordErrors({}); top();
  }
  function open(kind: Kind, key: string) {
    const item = list(kind).find(x => x.key === key);
    const target = { kind, key, isNew: false, snapshot: JSON.stringify(item) };
    setEditing(target); setRecordErrors(readOnly ? {} : recordIssues(target)); top();
  }
  // The hardware back button closes an open record form first, as its ×.
  useEffect(() => {
    backRef.current = () => {
      if (editing) { dismissRecord(); return true; }
      if (!unsaved.current) { close(); return true; }
      Alert.alert('Dəyişiklik saxlanmadı', 'Lokal yaddaşa yazmaq alınmadı. Məlumatı itirməmək üçün formada qalın.', [{ text: 'Formada qal' }]);
      return true;
    };
  });
  function goTo(index: number) { setStep(index); setEditing(null); setErrors({}); setRecordErrors({}); top(); }
  function next() {
    if (!catalog) return;
    const issues = validate(data, catalog, step); setErrors(issues);
    if (Object.keys(issues).length) { top(); return; }
    if (step < STEPS.length - 1 && !locked(step + 1)) goTo(step + 1);
    else close();
  }
  // As in the web sidebar: the steps open once the account is chosen, and those after the members
  // once every member is related to a head.
  const locked = (index: number) => !readOnly && ((index > 0 && !data.adminUnitId) || (index > 1 && !relationshipsComplete(data)));
  const completed = [!!data.adminUnitId, data.isMembersSectionCompleted, data.isBuildingsSectionCompleted, data.vehicles.isSectionCompleted,
    data.isLandsSectionCompleted, data.livestock.isSectionCompleted];
  function toggleCompletion(flag: 'isMembersSectionCompleted' | 'isBuildingsSectionCompleted' | 'isLandsSectionCompleted' | 'vehicles' | 'livestock') {
    if (!catalog) return;
    const nextData: HouseholdData = flag === 'vehicles' ? { ...data, vehicles: { ...data.vehicles, isSectionCompleted: !data.vehicles.isSectionCompleted } }
      : flag === 'livestock' ? { ...data, livestock: { ...data.livestock, isSectionCompleted: !data.livestock.isSectionCompleted } }
      : { ...data, [flag]: !data[flag] };
    const completing = flag === 'vehicles' ? nextData.vehicles.isSectionCompleted : flag === 'livestock' ? nextData.livestock.isSectionCompleted : nextData[flag];
    if (completing) { const issues = validate(nextData, catalog, step); setErrors(issues); if (Object.keys(issues).length) { top(); return; } }
    save(nextData);
  }
  if (!catalog) return <SafeAreaView style={[styles.safe, { padding: 24, gap: 20 }]}><Text style={styles.title}>Formanı açmaq üçün arayışları onlayn yükləyin.</Text><Button label="Siyahıya qayıt" onPress={close} /></SafeAreaView>;
  const member = editing?.kind === 'member' ? data.members.find(x => x.key === editing.key) ?? null : null;
  const building = editing?.kind === 'building' ? data.buildings.find(x => x.key === editing.key) ?? null : null;
  const land = editing?.kind === 'land' ? data.lands.find(x => x.key === editing.key) ?? null : null;
  const record = member ?? building ?? land;
  const notice = review ? null : draftNotice(draft, SUBJECT);
  const hasHead = data.members.some(x => x.isHead);
  const completion = (checked: boolean, flag: Parameters<typeof toggleCompletion>[0]) =>
    <Checkbox large={flag === 'vehicles' || flag === 'livestock'} label={DONE} checked={checked} onChange={() => toggleCompletion(flag)} />;
  // The record forms' headings as on Tbu.Web.
  const recordTitle = member ? (editing?.isNew ? 'Üzv əlavə et' : member.isHead ? 'Təsərrüfat başçısı məlumatları' : 'Üzv məlumatları')
    : building ? (editing?.isNew ? 'Tikili əlavə et' : 'Tikili məlumatları') : land ? `${editing?.isNew ? 'Torpaq əlavə et' : 'Torpaq məlumatları'} (hektar (ha) ilə)` : '';
  const rowMenu = (kind: Kind, key: string, title: string, removable: boolean) => setMenu({ kind, key, title, removable });
  const issueList = record ? recordErrors : errors;
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}><View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{draft.server?.personalAccountNumber ? `Təsərrüfat № ${draft.server.personalAccountNumber}` : 'Yeni təsərrüfat'}</Text>
        <Text style={styles.headerHint}>{review ? review.hint : `Lokal qeyd · ${households.online ? 'Onlayn' : 'Oflayn'} · ${gpsLabel(gps.latest, households.maxAccuracy)}`}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Bağla" onPress={close} hitSlop={8} style={styles.ghost}>
          <Text style={styles.ghostX}>×</Text><Text style={styles.ghostText}>Bağla</Text></Pressable>
      </View>
      <View style={[styles.body, wide && { flexDirection: 'row' }]}>
        <Steps wide={wide} step={step} completed={completed} locked={locked} onSelect={goTo} />
        <View style={styles.content}>
          <ReadOnly value={readOnly}><ScrollView ref={scroll} style={styles.flex} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.form, wide && { padding: 28 }]}>
            <View style={[styles.formInner, view !== step && { opacity: 0.5 }, record ? { maxWidth: 720 } : view === 0 ? { maxWidth: 554 } : view === 3 ? { maxWidth: 616 } : view === 5 ? { maxWidth: 610 } : null]}>
              {record && <View style={styles.recordToolbar}><Text accessibilityRole="header" style={styles.recordTitle}>{recordTitle}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Bağla" onPress={dismissRecord} style={styles.closeRound}><Text style={styles.closeX}>×</Text></Pressable></View>}
              {review?.banner}
              {notice && <View style={{ gap: 10 }}><StateBanner tone={notice.tone} title={notice.title} text={notice.text} />
                {!!draft.conflict && <Button secondary label="Fərqlərə bax və qərar ver" onPress={() => router.push({ pathname: '/households/conflict/[id]', params: { id: draft.id } })} />}</View>}
              {!review && !!draft.server && !pending(draft) && !draft.conflict && <StateBanner tone="info" title="Dəyişiklik etmədən çıxsanız, qeyd cihazdan silinəcək."
                text="Təsərrüfat serverdə qalır; lazım olsa, «Serverdə» tabından yenidən aça bilərsiniz." />}
              {!review && !!draft.events?.some(event => !event.location) && <StateBanner tone="warning" title="Bəzi addımlar GPS məkanı gözləyir."
                text="GPS tutulduqdan sonra addımdan çıxın və ya formanı bağlayın; o vaxta qədər qeyd göndərilə bilməz." />}
              {!!saveError && <Text accessibilityRole="alert" style={styles.alert}>{saveError} Dəyişiklik hələ yadda saxlanmayıb.</Text>}
              {!!Object.keys(issueList).length && <Text accessibilityRole="alert" style={styles.alert}>{Object.values(issueList).join('\n')}</Text>}

              {member && readOnly && <MemberReview member={member} catalog={catalog} />}
              {member && !readOnly && <MemberEditor member={member} data={data} catalog={catalog} errors={recordErrors} online={households.online}
                serverHouseholdId={draft.server?.reportId ?? null} idCard={households.idCard} onChange={item => replace('members', item)}
                makeHead={editing?.makeHead === true}
                onMakeHead={() => editing?.makeHead ? setEditing({ ...editing, makeHead: false }) : hasHead ? setMakingHead(member) : setEditing(current => current && { ...current, makeHead: true })} />}
              {building && <BuildingEditor building={building} catalog={catalog} errors={recordErrors} onChange={item => replace('buildings', item)} />}
              {land && <LandEditor land={land} catalog={catalog} errors={recordErrors} onChange={item => replace('lands', item)} />}

              {!record && view === 0 && readOnly && <View style={{ gap: 20 }}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Şəxsi hesab</Text>
                <View style={styles.reviewRow}>
                  <View style={styles.reviewField}><Text style={styles.muted}>Hesabat ili</Text><Text style={styles.reviewValue}>{data.reportYear}</Text></View>
                  {!!draft.server?.personalAccountNumber && <View style={styles.reviewField}><Text style={styles.muted}>Şəxsi hesab №</Text><Text style={styles.reviewValue}>{draft.server.personalAccountNumber}</Text></View>}
                </View>
                <View style={styles.reviewField}><Text style={styles.muted}>Təsərrüfatın ünvanı</Text><Text style={styles.reviewValue}>{review?.address || accountAddress(data, catalog) || '-'}</Text></View>
              </View>}
              {!record && view === 0 && !readOnly && <View style={{ gap: 20 }}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Şəxsi hesab</Text>
                <View style={styles.year}><Text style={styles.muted}>Hesabat ili</Text><Text style={styles.yearValue}>{data.reportYear}</Text></View>
                {!!draft.server?.personalAccountNumber && <View style={styles.year}><Text style={styles.muted}>Şəxsi hesab №</Text><Text style={styles.yearValue}>{draft.server.personalAccountNumber}</Text></View>}
                <AddressFields label="Təsərrüfatın ünvanı" data={data as unknown as PersonalData} catalog={catalog} errors={errors} onChange={value => save({ ...data,
                  adminUnitId: value.adminUnitId as number | null, throughFareId: value.throughFareId as number | null, entranceId: value.entranceId as number | null,
                  addressIsOther: value.addressIsOther === true, addressOtherNote: String(value.addressOtherNote ?? '') })} />
              </View>}

              {!record && view === 1 && <>
                <Toolbar title={DESCRIPTIONS[1]!} add="Üzv əlavə et" onAdd={() => addRecord('member')} />
                {readOnly ? null : data.members.length > 0 && !hasHead ? <Notice text="Növbəti addıma keçmək üçün təsərrüfat başçısını seçin." />
                  : !relationshipsComplete(data) ? <Notice text="Növbəti addıma keçmək üçün bütün üzvlərin qohumluq əlaqələrini yenidən seçin." /> : null}
                {data.members.length ? <Table columns={MEMBER_COLUMNS} rows={data.members.map((item, index) => {
                  const issue = Object.values(validateMember(item, data, catalog))[0];
                  const needsRelationship = !item.isHead && hasHead && !item.personal.householdRelationshipTypeId;
                  return { key: item.key, onPress: () => open('member', item.key), onMenu: () => rowMenu('member', item.key, memberName(item) || 'Yeni üzv', !(item.isHead && data.members.length > 1)),
                    cells: [<Text key="n" style={styles.cell}>{item.id ?? index + 1}</Text>,
                      <View key="name" style={{ gap: 4 }}><View style={styles.nameCell}><Text style={styles.cell}>{memberName(item) || 'Yeni üzv'}</Text>
                        {item.isHead && <Text style={styles.headBadge}>Təsərrüfat başçısı</Text>}</View>
                        {!readOnly && !!issue && <Text numberOfLines={2} style={styles.issue}>{issue}</Text>}</View>,
                      <Text key="b" style={styles.cell}>{typeof item.personal.birthDate === 'string' ? item.personal.birthDate.split('-').reverse().join('.') : ''}</Text>,
                      item.isHead ? <Text key="r" style={styles.cell}>—</Text> : needsRelationship
                        ? <Text key="r" style={[styles.cell, styles.required]}>Yenidən seçilməlidir</Text> : <Text key="r" style={styles.cell}>{relationship(item, catalog)}</Text>,
                      <Text key="m" style={styles.cell}>—</Text>] };
                })} /> : <EmptyState kind="member" message="Əlavə edilmiş üzv yoxdur" />}
                {completion(data.isMembersSectionCompleted, 'isMembersSectionCompleted')}
              </>}

              {!record && view === 2 && <>
                <Toolbar title={DESCRIPTIONS[2]!} add="Tikili əlavə et" onAdd={() => addRecord('building')} />
                {data.buildings.length ? <Table columns={BUILDING_COLUMNS} rows={data.buildings.map((item, index) => {
                  const issue = Object.values(validateBuilding(item, catalog))[0];
                  return { key: item.key, onPress: () => open('building', item.key), onMenu: () => rowMenu('building', item.key, `Tikili ${index + 1}`, true),
                    cells: [<Text key="n" style={styles.cell}>{item.id ?? index + 1}</Text>,
                      <View key="t" style={{ gap: 4 }}><Text style={styles.cell}>{catalog.lookups.buildingDwelling?.find(x => x.id === item.fields.dwellingType)?.label ?? '—'}</Text>
                        {!readOnly && !!issue && <Text numberOfLines={2} style={styles.issue}>{issue}</Text>}</View>,
                      <Text key="a" style={styles.cell}>{item.fields.totalAreaSqm ? `${item.fields.totalAreaSqm} m²` : '0 m²'}</Text>] };
                })} /> : <EmptyState kind="building" message="Əlavə edilmiş tikili yoxdur" />}
                {completion(data.isBuildingsSectionCompleted, 'isBuildingsSectionCompleted')}
              </>}

              {!record && view === 3 && <>
                <PageTitle>{DESCRIPTIONS[3]}</PageTitle>
                <VehiclesStep vehicles={data.vehicles} catalog={catalog} errors={errors} onChange={vehicles => save({ ...data, vehicles })} />
                {completion(data.vehicles.isSectionCompleted, 'vehicles')}
              </>}

              {!record && view === 4 && <>
                <Toolbar title={DESCRIPTIONS[4]!} add="Torpaq əlavə et" onAdd={() => addRecord('land')} />
                {data.lands.length ? <Table columns={LAND_COLUMNS} rows={data.lands.map((item, index) => {
                  const issue = Object.values(validateLand(item, catalog))[0];
                  return { key: item.key, onPress: () => open('land', item.key), onMenu: () => rowMenu('land', item.key, `Torpaq ${index + 1}`, true),
                    cells: [<Text key="n" style={styles.cell}>{item.id ?? index + 1}</Text>,
                      <View key="a" style={{ gap: 4 }}><Text style={styles.cell}>{landArea(item, catalog)} ha</Text>
                        {!readOnly && !!issue && <Text numberOfLines={2} style={styles.issue}>{issue}</Text>}</View>] };
                })} /> : <EmptyState kind="land" message="Əlavə edilmiş torpaq yoxdur" />}
                {completion(data.isLandsSectionCompleted, 'isLandsSectionCompleted')}
              </>}

              {!record && view === 5 && <>
                <PageTitle>{DESCRIPTIONS[5]}</PageTitle>
                <LivestockStep livestock={data.livestock} catalog={catalog} errors={errors} onChange={livestock => save({ ...data, livestock })} />
                {completion(data.livestock.isSectionCompleted, 'livestock')}
              </>}
            </View>
          </ScrollView></ReadOnly>
          {/* Under review a record form has no footer, and the steps only lead on, the last one to "Bağla", as on the web. */}
          {readOnly ? !record && <View style={[styles.footer, wide && { paddingHorizontal: 28 }]}>
            {step > 0 ? <WebButton secondary label="‹  Geri" onPress={() => goTo(step - 1)} /> : <View />}
            {step < STEPS.length - 1 ? <WebButton label="Növbəti  ›" onPress={() => goTo(step + 1)} /> : <WebButton label="Bağla" onPress={close} />}
          </View> : <View style={[styles.footer, wide && { paddingHorizontal: 28 }]}>
            {record ? <View /> : step > 0 ? <WebButton secondary label="‹  Geri" onPress={() => goTo(step - 1)} /> : <View />}
            <View style={styles.footerActions}>
              <Text accessibilityLiveRegion="polite" style={[styles.saved, !!saveError && { color: '#B91C1C' }]}>{saveError ? 'Saxlanmadı' : '✓ Cihazda saxlanıldı'}</Text>
              {record ? <WebButton label={editing?.isNew ? 'Əlavə et' : 'Yadda saxla'} onPress={submitRecord} />
                : step < STEPS.length - 1 ? <WebButton label="Növbəti  ›" disabled={step === 1 && !relationshipsComplete(data)} onPress={next} />
                : <WebButton secondary label="Yadda saxla" onPress={next} />}
            </View>
          </View>}
        </View>
      </View>
    </KeyboardAvoidingView>
    {menu && <ActionSheet title={menu.title} onClose={() => setMenu(null)} items={readOnly
      ? [{ label: 'Ətraflı bax', onPress: () => { open(menu.kind, menu.key); setMenu(null); } }] : [
      { label: 'Redaktə et', onPress: () => { open(menu.kind, menu.key); setMenu(null); } },
      { label: 'Sil', danger: true, disabled: !menu.removable, hint: menu.removable ? undefined : 'Başçı digər üzvlərdən sonra silinə bilər.',
        onPress: () => { setRemoving(menu); setMenu(null); } },
    ]} />}
    {removing && <ConfirmDialog danger confirmLabel="Sil"
      title={{ member: 'Üzv məlumatını silmək istədiyinizə əminsiniz?', building: 'Tikili məlumatını silmək istədiyinizə əminsiniz?', land: 'Torpaq məlumatını silmək istədiyinizə əminsiniz?' }[removing.kind]}
      text="Qeyd bu təsərrüfatdan silinəcək. Sinxronizasiyadan sonra serverdən də silinəcək."
      onCancel={() => setRemoving(null)} onConfirm={() => {
        const key = RECORDS[removing.kind];
        save({ ...data, [key]: list(removing.kind).filter(x => x.key !== removing.key), [COMPLETION[key]]: false }); setRemoving(null);
      }} />}
    {makingHead && <ConfirmDialog confirmLabel="Başçı təyin et" title="Təsərrüfat başçısı dəyişdirilsin?"
      text="Digər üzvlərin qohumluq əlaqələri sıfırlanacaq və yenidən doldurulmalıdır."
      onCancel={() => setMakingHead(null)} onConfirm={() => { setEditing(current => current && { ...current, makeHead: true }); setMakingHead(null); }} />}
  </SafeAreaView>;
}

/** Tbu.Web's wizard sidebar: a marker per step (its icon; active, ✓ completed), locked steps faded, hints on the "i". */
function Steps({ wide, step, completed, locked, onSelect }: { wide: boolean; step: number; completed: boolean[]; locked(index: number): boolean; onSelect(index: number): void }) {
  // On a phone the steps scroll sideways and keep the current one in view. On a tablet the sidebar
  // starts folded to its markers and opens to the step names.
  const strip = useRef<ScrollView>(null), offsets = useRef<number[]>([]), [collapsed, setCollapsed] = useState(true);
  const folded = wide && collapsed;
  useEffect(() => { if (!wide) strip.current?.scrollTo({ x: Math.max(0, (offsets.current[step] ?? 0) - 24), animated: true }); }, [step, wide]);
  // As .wizard-step.complete::after: the line below a completed step is blue.
  const doneAt = (index: number) => step !== index && completed[index];
  const items = STEPS.map((label, index) => {
    const active = step === index, done = doneAt(index), disabled = locked(index);
    return <View key={label} onLayout={event => { offsets.current[index] = event.nativeEvent.layout.x; }} style={[styles.step, wide ? styles.wideStep : styles.narrowStep, folded && styles.foldedStep]}>
      {/* The line is drawn in halves through each marker's centre, so it joins whatever a step's height. */}
      {wide && index > 0 && <View style={[styles.connector, styles.upper, folded && styles.foldedConnector, doneAt(index - 1) && { backgroundColor: web.primary }]} />}
      {wide && index < STEPS.length - 1 && <View style={[styles.connector, styles.lower, folded && styles.foldedConnector, done && { backgroundColor: web.primary }]} />}
      <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={() => onSelect(index)}
        style={({ pressed }) => [styles.stepLink, folded && styles.foldedLink, pressed && { backgroundColor: web.add }, disabled && { opacity: 0.55 }]}>
        <StepMarker icon={ICONS[index]} active={active} done={done} />
        {!folded && <Text style={[styles.stepText, active && { color: web.primary, fontWeight: '600' }, done && { color: web.text }]}>{label}</Text>}
      </Pressable>
      {!!DESCRIPTIONS[index] && wide && !folded && <Info text={`${DESCRIPTIONS[index]}.`} />}
    </View>;
  });
  return <View style={[styles.sidebar, wide && styles.wideSidebar, folded && styles.foldedSidebar]}>
    {wide ? <View><View style={[styles.toggleRow, folded && { alignItems: 'center' }]}><SidebarToggle collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /></View>{items}</View> : <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps}>{items}</ScrollView>}
  </View>;
}
/** The list pages' toolbar: the step heading and the primary "… əlavə et". */
function Toolbar({ title, add, onAdd }: { title: string; add: string; onAdd(): void }) {
  const readOnly = useReadOnly();
  return <View style={styles.toolbar}><View style={{ flex: 1, minWidth: 200 }}><PageTitle>{title}</PageTitle></View>{!readOnly && <WebButton label={`+  ${add}`} onPress={onAdd} />}</View>;
}
type Column = { label: string; width: number };
const MEMBER_COLUMNS: Column[] = [{ label: 'No', width: 64 }, { label: 'Soyad, ad, ata adı', width: 240 }, { label: 'Doğum tarixi', width: 120 },
  { label: 'Qohumluq əlaqəsi', width: 180 }, { label: 'MyGov vəziyyəti', width: 130 }];
const BUILDING_COLUMNS: Column[] = [{ label: 'No', width: 64 }, { label: 'Tikilinin növü', width: 240 }, { label: 'Sahəsi (kv. metr)', width: 160 }];
const LAND_COLUMNS: Column[] = [{ label: 'No', width: 64 }, { label: 'Sahəsi (ha)', width: 220 }];
/** The web's data table: scrolls sideways on a narrow screen; a row opens its form, "⋯" its menu. */
function Table({ columns, rows }: { columns: Column[]; rows: { key: string; cells: ReactNode[]; onPress(): void; onMenu(): void }[] }) {
  // Columns widen to fill the page and scroll sideways once it is narrower than the table.
  const [width, setWidth] = useState(0);
  const total = columns.reduce((sum, x) => sum + x.width, 0) + 56;
  const scale = Math.max(1, (width - 56) / (total - 56));
  const table = <View style={{ width: (total - 56) * scale + 56 }}>
    <View style={[styles.tr, styles.th]}>{columns.map(c => <Text key={c.label} style={[styles.thText, { width: c.width * scale }]}>{c.label}</Text>)}<View style={{ width: 56 }} /></View>
    {rows.map(row => <View key={row.key} style={styles.tr}>
      <Pressable accessibilityRole="button" accessibilityLabel="Formanı aç" onPress={row.onPress} style={({ pressed }) => [styles.trLink, pressed && { backgroundColor: web.surface50 }]}>
        {row.cells.map((cell, index) => <View key={index} style={[styles.td, { width: columns[index].width * scale }]}>{cell}</View>)}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Əməliyyatları aç" onPress={row.onMenu} style={styles.menuButton}>
        <View style={styles.dots}>{[0, 1, 2].map(x => <View key={x} style={styles.dotSmall} />)}</View></Pressable>
    </View>)}
  </View>;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <ScrollView horizontal showsHorizontalScrollIndicator={total > width}>{table}</ScrollView></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#FFF' },
  header: { minHeight: 80, borderBottomWidth: 1, borderBottomColor: web.line, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: web.text, fontSize: 16, fontWeight: '500', lineHeight: 24 }, headerHint: { color: web.muted, fontSize: 12, marginTop: 2 },
  ghost: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 12 }, ghostX: { color: web.muted, fontSize: 20, lineHeight: 22 }, ghostText: { color: web.muted, fontSize: 13 },
  body: { flex: 1 },
  sidebar: { backgroundColor: web.surface50, borderBottomWidth: 1, borderBottomColor: web.line }, wideSidebar: { width: 224, padding: 24, borderBottomWidth: 0, borderRightWidth: 1, borderRightColor: web.line },
  foldedSidebar: { width: 80, paddingHorizontal: 0 }, toggleRow: { paddingHorizontal: 2, marginBottom: 12 },
  // Folded, each step is a full-width 80 × 52 target, not just its marker; the line joins the centred markers.
  foldedStep: { paddingHorizontal: 0 }, foldedLink: { flex: 1, minHeight: 52, justifyContent: 'center' }, foldedConnector: { left: 39.5 },
  steps: { paddingHorizontal: 12, paddingVertical: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 6 }, wideStep: { minHeight: 52, paddingVertical: 8, paddingHorizontal: 4 }, narrowStep: { minHeight: 48, paddingHorizontal: 8 },
  stepLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flexShrink: 1 },
  connector: { position: 'absolute', left: 21.5, width: 1, backgroundColor: web.line }, upper: { top: 0, height: '50%' }, lower: { top: '50%', bottom: 0 },
  stepText: { color: web.muted, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  content: { flex: 1, backgroundColor: '#FFF' }, form: { padding: 16, alignItems: 'center' }, formInner: { width: '100%', maxWidth: 820, gap: 24 },
  title: { color: web.text, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  sectionTitle: { color: web.text, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  year: { gap: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: web.line }, yearValue: { color: web.text, fontSize: 16, lineHeight: 24 },
  muted: { color: web.muted, fontSize: 14, lineHeight: 20 },
  // Tbu.Web's .wizard-review-*: the account step under review.
  reviewRow: { flexDirection: 'row', gap: 12 }, reviewField: { flex: 1, minWidth: 0, paddingVertical: 6, gap: 4 }, reviewValue: { color: web.text, fontSize: 16, lineHeight: 24 },
  recordToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 38 },
  recordTitle: { flex: 1, color: web.text, fontSize: 16, fontWeight: '600', lineHeight: 24 },
  closeRound: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, closeX: { color: web.text, fontSize: 24, lineHeight: 26 },
  alert: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 12, borderRadius: 6, lineHeight: 22 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  tr: { flexDirection: 'row', alignItems: 'stretch', minHeight: 56, borderBottomWidth: 1, borderBottomColor: web.line }, th: { alignItems: 'center' },
  thText: { paddingHorizontal: 14, color: web.text, fontSize: 14, fontWeight: '600' },
  trLink: { flex: 1, flexDirection: 'row', alignItems: 'center' }, td: { paddingHorizontal: 14, paddingVertical: 10 },
  cell: { color: web.text, fontSize: 14, lineHeight: 20 }, nameCell: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  headBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: '#E8F0FF', color: web.primary, fontSize: 12, fontWeight: '500', overflow: 'hidden' },
  required: { color: '#B42318', fontWeight: '600' }, issue: { color: '#9A3412', fontSize: 12, lineHeight: 17 },
  menuButton: { width: 56, alignItems: 'center', justifyContent: 'center' },
  dots: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: web.line, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center' },
  dotSmall: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: '#475569' },
  footer: { minHeight: 76, borderTopWidth: 1, borderTopColor: web.line, paddingHorizontal: 16, paddingVertical: 14, gap: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }, saved: { color: '#15803D', fontSize: 12, flexShrink: 1 },
});

import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Button, Check, colors, ui } from '../components/ResidentControls';
import { useHouseholds } from './context';
import { ServerList } from './ServerList';
import { AppBrand } from '../components/AppBrand';
import { HeaderMenu } from '../components/HeaderMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { PageMessages, ReferenceStatus } from '../components/ReferenceStatus';
import { ModuleTabs } from '../components/ModuleTabs';
import { ActionSheet, ConfirmDialog } from '../components/ActionSheet';
import { draftNotice } from '../components/StateBanner';
import { RecordHeader, RecordRow, type RowChip } from '../components/RecordRow';
import { householdTone } from '../components/StatusChip';
import { editable, householdOwner, newHouseholdData, pending, type HouseholdDraft } from './types';
import { firstIssue } from './steps';
export default function ListScreen() {
  const households = useHouseholds(), { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<string[]>([]), [localError, setLocalError] = useState('');
  const [source, setSource] = useState<'device' | 'server'>('device');
  const visible = useMemo(() => households.drafts.filter(draft => {
    const members = draft.data.members.flatMap(x => [x.personal.lastName, x.personal.firstName, x.personal.fin]);
    return [...members, draft.server?.personalAccountNumber, draft.id].join(' ').toLocaleLowerCase('az-AZ').includes(query.trim().toLocaleLowerCase('az-AZ'));
  }), [households.drafts, query]);
  // A record with unsent changes is checked as the sync would check it, so an incomplete form
  // reads as "to complete" rather than as a failed upload.
  const incomplete = useMemo(() => {
    const result = new Map<string, string>();
    if (households.catalog) for (const draft of households.drafts) {
      const issue = pending(draft) && !draft.deleted ? firstIssue(draft.data, households.catalog) : null;
      if (issue) result.set(draft.id, Object.values(issue.errors)[0]);
    }
    return result;
  }, [households.drafts, households.catalog]);
  // An incomplete record opens on the step that keeps it from syncing.
  const openRecord = (id: string) => router.push({ pathname: '/households/[id]', params: incomplete.has(id) ? { id, check: '1' } : { id } });
  // Incomplete, locked and deleted records cannot be sent; they wait for the operator instead.
  const selectable = visible.filter(x => pending(x) && !x.deleted && x.status?.canEdit !== false && !incomplete.has(x.id)).map(x => x.id);
  const [menu, setMenu] = useState<HouseholdDraft | null>(null), [removing, setRemoving] = useState<HouseholdDraft | null>(null);
  const selected = selection.filter(id => selectable.includes(id));
  const waiting = households.drafts.filter(pending).length;
  // The field tablet is 800 dp wide in portrait; from 720 dp the list is Tbu.Web's table, below it phone cards.
  const wide = width >= 720;
  function create() {
    if (!households.catalog) return;
    try {
      const draft = households.create(newHouseholdData(households.catalog.reportYear));
      router.push({ pathname: '/households/[id]', params: { id: draft.id } });
    } catch (cause) { setLocalError(cause instanceof Error ? cause.message : 'Qeyd yaradıla bilmədi.'); }
  }
  return <SafeAreaView style={styles.safe}><StatusBar style="light" />
    <View style={styles.topbar}><AppBrand />
      <View style={styles.actions}><NotificationBell /><HeaderMenu /></View></View>
    <View style={styles.tabs}><ModuleTabs active="/households" /></View>
    <View style={styles.page}>
      <Text style={styles.breadcrumb}>Təsərrüfatların uçotu  /  Ev təsərrüfatlarının uçotu kitabı</Text>
      <View style={styles.titleRow}><View style={{ flex: 1, minWidth: 240 }}><Text style={styles.title}>Ev təsərrüfatları</Text><Text style={styles.subtitle}>{waiting} qeyd sinxronizasiya gözləyir</Text></View>
        <Button label="+ Yeni" onPress={create} disabled={!households.store || !households.catalog || households.syncing} /></View>
      <ReferenceStatus />
      <PageMessages error={localError || households.error} notice={households.notice} onClose={() => { setLocalError(''); households.dismiss(); }} />
      <View style={styles.sources}>{([['device', 'Cihazda'], ['server', 'Serverdə']] as const).map(([value, label]) =>
        <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: source === value }} onPress={() => setSource(value)} style={[styles.source, source === value && styles.activeSource]}>
          <Text style={[styles.sourceText, source === value && { color: '#FFF' }]}>{label}</Text></Pressable>)}</View>
      <View style={styles.card}>{source === 'server' ? <ServerList wide={wide} /> : <>
        <View style={styles.toolbar}>
          <TextInput accessibilityLabel="Başçı, FİN və ya hesab nömrəsinə görə axtarış" placeholder="Başçı, FİN və ya hesab №" value={query} onChangeText={value => { setQuery(value); setSelection([]); }} style={[ui.input, styles.search]} placeholderTextColor={colors.muted} /></View>
        <View style={styles.selectRow}><View style={{ flex: 1, minWidth: 0 }}><Check label={selected.length ? `${selected.length} qeyd seçilib` : 'Hamısını seç'} checked={selectable.length > 0 && selected.length === selectable.length}
          disabled={!selectable.length || households.syncing} onChange={() => setSelection(selected.length === selectable.length ? [] : selectable)} /></View>
          {/* The checkbox label flexes; the count keeps its width so it is never clipped. */}
          <Text numberOfLines={1} style={[styles.catalogText, styles.count]}>{visible.length} qeyd</Text></View>
        {wide && <RecordHeader check columns={['Təsərrüfat başçısı', 'Ünvan', 'Status']} />}
        {households.loading ? <ActivityIndicator style={{ margin: 40 }} color={colors.primary} /> : <FlatList data={visible} keyExtractor={item => item.id} style={{ flex: 1 }}
          contentContainerStyle={!visible.length ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>≡</Text><Text style={styles.emptyTitle}>{query ? 'Qeyd tapılmadı' : 'Hələ qeyd yoxdur'}</Text><Text style={styles.emptyText}>Yeni təsərrüfat əlavə edin. Qeydləri internet olmadan doldurub daha sonra seçərək sinxron edə bilərsiniz.</Text></View>}
          renderItem={({ item }) => {
            const name = householdOwner(item.data) || 'Yeni ev təsərrüfatı';
            const notice = draftNotice(item, 'Təsərrüfat'), canSelect = selectable.includes(item.id), issue = incomplete.get(item.id);
            const failed = !!item.lastError && !notice && !issue;
            const chips: RowChip[] = [issue ? { label: 'Natamamdır', tone: 'warning' } : failed ? { label: 'Sinxronizasiya alınmadı', tone: 'danger' }
              : pending(item) ? { label: item.server ? 'Dəyişiklik göndərilməyib' : 'Sinxronlaşmayıb', tone: 'warning' } : { label: 'Sinxronlaşıb', tone: 'success' }];
            if (item.status) chips.push({ label: item.status.statusName, tone: householdTone(item.status.status) });
            if (notice && !notice.fromStatus) chips.push({ label: notice.badge, tone: notice.tone === 'danger' ? 'danger' : notice.tone === 'warning' ? 'warning' : 'info' });
            if (item.server?.downloaded) chips.push({ label: 'Serverdən endirilib', tone: 'neutral' });
            const toggle = () => setSelection(selected.includes(item.id) ? selection.filter(id => id !== item.id) : [...selection, item.id]);
            return <RecordRow wide={wide} title={name} chips={chips}
              meta={`Hesab № ${item.server?.personalAccountNumber || '—'} · ${item.data.members.length} üzv · ${item.data.reportYear}`}
              address={households.catalog?.addresses.adminUnit(item.data.adminUnitId)?.label || 'Ünvan seçilməyib'}
              note={issue ? { text: issue, tone: 'warning' } : failed && item.lastError ? { text: item.lastError, tone: 'danger' } : undefined}
              check={{ checked: selected.includes(item.id), disabled: !canSelect || households.syncing, onToggle: toggle }}
              onOpen={() => openRecord(item.id)} onMenu={() => setMenu(item)} />;
          }} />}
      </>}</View>
      {source === 'device' && <View style={styles.bottom}><Text style={styles.bottomText}>Yalnız seçilmiş qeydlər göndəriləcək.</Text><Button label={households.syncing ? `Sinxron edilir… ${households.progress}` : `Seçilənləri sinxron et${selected.length ? ` (${selected.length})` : ''}`}
        disabled={!households.online || !selected.length || households.syncing || !households.catalog} onPress={() => void households.sync(selected)} /></View>}
    </View>
    {menu && <ActionSheet title={householdOwner(menu.data) || 'Yeni ev təsərrüfatı'}
      subtitle={draftNotice(menu, 'Təsərrüfat')?.title} onClose={() => setMenu(null)} items={[
        { label: editable(menu) ? 'Redaktə et' : 'Bax', onPress: () => { setMenu(null); openRecord(menu.id); } },
        ...menu.conflict ? [{ label: 'Fərqlərə bax və qərar ver', onPress: () => { setMenu(null); router.push({ pathname: '/households/conflict/[id]', params: { id: menu.id } }); } }] : [],
        { label: menu.server ? 'Cihazdan çıxar' : 'Qaralamanı sil', danger: true, disabled: households.syncing,
          hint: menu.server && !menu.deleted ? 'Təsərrüfat serverdə qalır, yalnız bu cihazdan silinir.' : undefined,
          onPress: () => { setRemoving(menu); setMenu(null); } },
      ]} />}
    {removing && <ConfirmDialog danger confirmLabel={removing.server ? 'Cihazdan çıxar' : 'Sil'}
      title={removing.server ? 'Qeyd bu cihazdan çıxarılsın?' : 'Qaralama silinsin?'}
      text={!removing.server ? 'Bu qaralama serverə göndərilməyib və birdəfəlik silinəcək.'
        : pending(removing) ? 'Bu qeyddə göndərilməmiş dəyişikliklər var. Onlar itəcək; serverdəki təsərrüfat dəyişməz qalacaq.'
        : 'Serverdəki təsərrüfat dəyişməz qalır. Lazım olsa, «Serverdə» tabından yenidən redaktə üçün endirə bilərsiniz.'}
      onCancel={() => setRemoving(null)} onConfirm={() => {
        try { households.remove(removing.id, true); setSelection(current => current.filter(id => id !== removing.id)); setRemoving(null); }
        catch (cause) { setLocalError(cause instanceof Error ? cause.message : 'Qeyd silinmədi.'); setRemoving(null); }
      }} />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  tabs: { paddingHorizontal: 20, paddingBottom: 10 },
  safe: { flex: 1, backgroundColor: colors.primary }, actions: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }, topbar: { minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, 
  page: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 }, breadcrumb: { color: colors.muted, fontSize: 12, lineHeight: 19 }, titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }, title: { fontSize: 23, lineHeight: 31, color: colors.text, fontWeight: '600' }, subtitle: { fontSize: 13, color: colors.muted, marginTop: 4 }, 
  catalogText: { color: colors.muted, fontSize: 12, lineHeight: 19 }, card: { flex: 1, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', minHeight: 180 }, toolbar: { padding: 14, gap: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }, search: { flex: 1, minWidth: 210 }, count: { flexShrink: 0, marginLeft: 12 }, selectRow: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line },
  sources: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 3, gap: 3 }, source: { minHeight: 40, minWidth: 104, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 6 }, activeSource: { backgroundColor: colors.primary }, sourceText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 }, emptyIcon: { color: '#94A3B8', fontSize: 38 }, emptyTitle: { fontSize: 17, color: colors.text, textAlign: 'center', fontWeight: '500' }, emptyText: { color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 420 }, bottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, bottomText: { color: colors.muted, fontSize: 12 },
});

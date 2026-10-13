import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Button, Check, colors, ui } from '../components/ResidentControls';
import { useResidents } from './context';
import { ServerList } from './ServerList';
import { AppBrand } from '../components/AppBrand';
import { HeaderMenu } from '../components/HeaderMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { PageMessages, ReferenceStatus } from '../components/ReferenceStatus';
import { ModuleTabs } from '../components/ModuleTabs';
import { ActionSheet, ConfirmDialog } from '../components/ActionSheet';
import { HistorySheet } from '../history/HistorySheet';
import { getHistory } from './server';
import { draftNotice } from '../components/StateBanner';
import { RecordHeader, RecordRow, type RowChip } from '../components/RecordRow';
import { residentTone } from '../components/StatusChip';
import { editable, newResidentData, pending, type ResidentDraft } from './types';
import { firstIssue } from './schema';
export default function ListScreen() {
  const residents = useResidents(), { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<string[]>([]), [localError, setLocalError] = useState('');
  const [source, setSource] = useState<'device' | 'server'>('device');
  const visible = useMemo(() => residents.drafts.filter(draft => {
    const p = draft.data.personal;
    return [p.firstName, p.lastName, p.fatherName, p.fin, draft.server?.personalAccountNumber, draft.id].join(' ').toLocaleLowerCase('az-AZ').includes(query.trim().toLocaleLowerCase('az-AZ'));
  }), [residents.drafts, query]);
  // A record with unsent changes is checked as the sync would check it, so an incomplete form
  // reads as "to complete" rather than as a failed upload.
  const incomplete = useMemo(() => {
    const result = new Map<string, string>();
    if (residents.catalog) for (const draft of residents.drafts) {
      const issue = pending(draft) && !draft.deleted ? firstIssue(draft.data, residents.catalog) : null;
      if (issue) result.set(draft.id, Object.values(issue.errors)[0]);
    }
    return result;
  }, [residents.drafts, residents.catalog]);
  // An incomplete record opens on the step that keeps it from syncing.
  const openRecord = (id: string) => router.push({ pathname: '/temporary-residents/[id]', params: incomplete.has(id) ? { id, check: '1' } : { id } });
  // Incomplete, locked and deleted records cannot be sent; they wait for the operator instead.
  const selectable = visible.filter(x => pending(x) && !x.deleted && x.status?.canEdit !== false && !incomplete.has(x.id)).map(x => x.id);
  const [menu, setMenu] = useState<ResidentDraft | null>(null), [removing, setRemoving] = useState<ResidentDraft | null>(null);
  const [history, setHistory] = useState<ResidentDraft | null>(null);
  const selected = selection.filter(id => selectable.includes(id));
  const waiting = residents.drafts.filter(pending).length;
  // The field tablet is 800 dp wide in portrait; from 720 dp the list is Tbu.Web's table, below it phone cards.
  const wide = width >= 720;
  function create() {
    if (!residents.catalog) return;
    try {
      const draft = residents.create(newResidentData(residents.catalog.reportYear));
      router.push({ pathname: '/temporary-residents/[id]', params: { id: draft.id } });
    } catch (cause) { setLocalError(cause instanceof Error ? cause.message : 'Qeyd yaradıla bilmədi.'); }
  }
  return <SafeAreaView style={styles.safe}><StatusBar style="light" />
    <View style={styles.topbar}><AppBrand />
      <View style={styles.actions}><NotificationBell /><HeaderMenu /></View></View>
    <View style={styles.tabs}><ModuleTabs active="/temporary-residents" /></View>
    <View style={styles.page}>
      <Text style={styles.breadcrumb}>Təsərrüfatların uçotu  /  Müvəqqəti yaşayan şəxslər</Text>
      <View style={styles.titleRow}><View style={{ flex: 1, minWidth: 240 }}><Text style={styles.title}>Müvəqqəti yaşayan şəxslər</Text><Text style={styles.subtitle}>{waiting} qeyd sinxronizasiya gözləyir</Text></View>
        <Button label="+ Yeni" onPress={create} disabled={!residents.store || !residents.catalog || residents.syncing} /></View>
      <ReferenceStatus />
      <PageMessages error={localError || residents.error} notice={residents.notice} onClose={() => { setLocalError(''); residents.dismiss(); }} />
      <View style={styles.sources}>{([['device', 'Cihazda'], ['server', 'Serverdə']] as const).map(([value, label]) =>
        <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: source === value }} onPress={() => setSource(value)} style={[styles.source, source === value && styles.activeSource]}>
          <Text style={[styles.sourceText, source === value && { color: '#FFF' }]}>{label}</Text></Pressable>)}</View>
      <View style={styles.card}>{source === 'server' ? <ServerList wide={wide} /> : <>
        <View style={styles.toolbar}>
          <TextInput accessibilityLabel="Ad, FİN və ya hesab nömrəsinə görə axtarış" placeholder="Ad, FİN və ya hesab №" value={query} onChangeText={value => { setQuery(value); setSelection([]); }} style={[ui.input, styles.search]} placeholderTextColor={colors.muted} /></View>
        <View style={styles.selectRow}><View style={{ flex: 1, minWidth: 0 }}><Check label={selected.length ? `${selected.length} qeyd seçilib` : 'Hamısını seç'} checked={selectable.length > 0 && selected.length === selectable.length}
          disabled={!selectable.length || residents.syncing} onChange={() => setSelection(selected.length === selectable.length ? [] : selectable)} /></View>
          {/* The checkbox label flexes; the count keeps its width so it is never clipped. */}
          <Text numberOfLines={1} style={[styles.catalogText, styles.count]}>{visible.length} qeyd</Text></View>
        {wide && <RecordHeader check columns={['Şəxsin məlumatları', 'Ünvan', 'Status']} />}
        {residents.loading ? <ActivityIndicator style={{ margin: 40 }} color={colors.primary} /> : <FlatList data={visible} keyExtractor={item => item.id} style={{ flex: 1 }}
          contentContainerStyle={!visible.length ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>≡</Text><Text style={styles.emptyTitle}>{query ? 'Qeyd tapılmadı' : 'Hələ qeyd yoxdur'}</Text><Text style={styles.emptyText}>Yeni şəxsi əlavə edin. Qeydləri internet olmadan doldurub daha sonra seçərək sinxron edə bilərsiniz.</Text></View>}
          renderItem={({ item }) => {
            const p = item.data.personal, name = [p.lastName, p.firstName, p.fatherName].filter(Boolean).join(' ') || 'Yeni müvəqqəti yaşayan şəxs';
            const notice = draftNotice(item), canSelect = selectable.includes(item.id), issue = incomplete.get(item.id);
            const failed = !!item.lastError && !notice && !issue;
            const chips: RowChip[] = [issue ? { label: 'Natamamdır', tone: 'warning' } : failed ? { label: 'Sinxronizasiya alınmadı', tone: 'danger' }
              : pending(item) ? { label: item.server ? 'Dəyişiklik göndərilməyib' : 'Sinxronlaşmayıb', tone: 'warning' } : { label: 'Sinxronlaşıb', tone: 'success' }];
            if (item.status) chips.push({ label: item.status.statusName, tone: residentTone(item.status.status) });
            if (notice && !notice.fromStatus) chips.push({ label: notice.badge, tone: notice.tone === 'danger' ? 'danger' : notice.tone === 'warning' ? 'warning' : 'info' });
            if (item.server?.downloaded) chips.push({ label: 'Serverdən endirilib', tone: 'neutral' });
            const toggle = () => setSelection(selected.includes(item.id) ? selection.filter(id => id !== item.id) : [...selection, item.id]);
            return <RecordRow wide={wide} title={name} chips={chips}
              meta={`FİN ${String(p.fin || '—')} · Hesab № ${item.server?.personalAccountNumber || '—'} · ${item.data.reportYear}`}
              address={residents.catalog?.addresses.adminUnit(item.data.adminUnitId)?.label || 'Ünvan seçilməyib'}
              note={issue ? { text: issue, tone: 'warning' } : failed && item.lastError ? { text: item.lastError, tone: 'danger' } : undefined}
              check={{ checked: selected.includes(item.id), disabled: !canSelect || residents.syncing, onToggle: toggle }}
              onOpen={() => openRecord(item.id)} onMenu={() => setMenu(item)} />;
          }} />}
      </>}</View>
      {source === 'device' && <View style={styles.bottom}><Text style={styles.bottomText}>Yalnız seçilmiş qeydlər göndəriləcək.</Text><Button label={residents.syncing ? `Sinxron edilir… ${residents.progress}` : `Seçilənləri sinxron et${selected.length ? ` (${selected.length})` : ''}`}
        disabled={!residents.online || !selected.length || residents.syncing || !residents.catalog} onPress={() => void residents.sync(selected)} /></View>}
    </View>
    {menu && <ActionSheet title={[menu.data.personal.lastName, menu.data.personal.firstName].filter(Boolean).join(' ') || 'Yeni müvəqqəti yaşayan şəxs'}
      subtitle={draftNotice(menu)?.title} onClose={() => setMenu(null)} items={[
        { label: editable(menu) ? 'Redaktə et' : 'Bax', onPress: () => { setMenu(null); openRecord(menu.id); } },
        { label: 'Tarixçə', onPress: () => { setHistory(menu); setMenu(null); } },
        ...menu.conflict ? [{ label: 'Fərqlərə bax və qərar ver', onPress: () => { setMenu(null); router.push({ pathname: '/temporary-residents/conflict/[id]', params: { id: menu.id } }); } }] : [],
        { label: menu.server ? 'Cihazdan çıxar' : 'Qaralamanı sil', danger: true, disabled: residents.syncing,
          hint: menu.server && !menu.deleted ? 'Hesabat serverdə qalır, yalnız bu cihazdan silinir.' : undefined,
          onPress: () => { setRemoving(menu); setMenu(null); } },
      ]} />}
    {/* The steps saved here and not yet sent, above the server's history once the record has reached it. */}
    {history && <HistorySheet title="Hesabatın tarixçəsi" local={history.events} onClose={() => setHistory(null)}
      load={history.server && residents.online ? async () => getHistory(await residents.accessToken(), history.server!.reportId) : undefined}
      note={!history.server ? 'Qeyd hələ serverə göndərilməyib; yalnız cihazdakı addımlar göstərilir.'
        : !residents.online ? 'Serverdəki tarixçəni görmək üçün internetə qoşulun.' : undefined} />}
    {removing && <ConfirmDialog danger confirmLabel={removing.server ? 'Cihazdan çıxar' : 'Sil'}
      title={removing.server ? 'Qeyd bu cihazdan çıxarılsın?' : 'Qaralama silinsin?'}
      text={!removing.server ? 'Bu qaralama serverə göndərilməyib və birdəfəlik silinəcək.'
        : pending(removing) ? 'Bu qeyddə göndərilməmiş dəyişikliklər var. Onlar itəcək; serverdəki hesabat dəyişməz qalacaq.'
        : 'Serverdəki hesabat dəyişməz qalır. Lazım olsa, «Serverdə» tabından yenidən redaktə üçün endirə bilərsiniz.'}
      onCancel={() => setRemoving(null)} onConfirm={() => {
        try { residents.remove(removing.id, true); setSelection(current => current.filter(id => id !== removing.id)); setRemoving(null); }
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

import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Button, Check, colors, ui } from '../components/ResidentControls';
import { useResidents } from './context';
import { ServerList } from './ServerList';
import { HeaderMenu } from './HeaderMenu';
import { ActionSheet, ConfirmDialog } from '../components/ActionSheet';
import { draftNotice } from './StateBanner';
import { editable, newResidentData, pending, type ResidentDraft } from './types';
export default function ListScreen() {
  const residents = useResidents(), { width } = useWindowDimensions();
  const [query, setQuery] = useState(''), [filter, setFilter] = useState<'all' | 'pending' | 'synced'>('pending');
  const [selection, setSelection] = useState<string[]>([]), [localError, setLocalError] = useState('');
  const [source, setSource] = useState<'device' | 'server'>('device');
  const visible = useMemo(() => residents.drafts.filter(draft => {
    if (filter === 'pending' && !pending(draft) || filter === 'synced' && pending(draft)) return false;
    const p = draft.data.personal;
    return [p.firstName, p.lastName, p.fatherName, p.fin, draft.server?.personalAccountNumber, draft.id].join(' ').toLocaleLowerCase('az-AZ').includes(query.trim().toLocaleLowerCase('az-AZ'));
  }), [residents.drafts, filter, query]);
  // Locked and deleted reports cannot be sent; they wait for the operator's decision instead.
  const selectable = visible.filter(x => pending(x) && !x.deleted && x.status?.canEdit !== false).map(x => x.id);
  const [menu, setMenu] = useState<ResidentDraft | null>(null), [removing, setRemoving] = useState<ResidentDraft | null>(null);
  const selected = selection.filter(id => selectable.includes(id));
  const waiting = residents.drafts.filter(pending).length;
  const wide = width >= 900;
  function create() {
    if (!residents.catalog) return;
    try {
      const draft = residents.create(newResidentData(residents.catalog.reportYear));
      router.push({ pathname: '/temporary-residents/[id]', params: { id: draft.id } });
    } catch (cause) { setLocalError(cause instanceof Error ? cause.message : 'Qeyd yaradıla bilmədi.'); }
  }
  return <SafeAreaView style={styles.safe}><StatusBar style="light" />
    <View style={styles.topbar}><View style={styles.brand}><Image source={require('../../assets/rih-login.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Rəqəmsal İcra Hakimiyyəti" /></View>
      <HeaderMenu /></View>
    <View style={styles.page}>
      <Text style={styles.breadcrumb}>Təsərrüfatların uçotu  /  Müvəqqəti yaşayan şəxslər</Text>
      <View style={styles.titleRow}><View style={{ flex: 1, minWidth: 240 }}><Text style={styles.title}>Müvəqqəti yaşayan şəxslər</Text><Text style={styles.subtitle}>{waiting} qeyd sinxronizasiya gözləyir</Text></View>
        <Button label="+ Yeni" onPress={create} disabled={!residents.store || !residents.catalog || residents.syncing} /></View>
      {!residents.catalog && !residents.loading && <View style={styles.catalogNotice}><Text style={styles.catalogNoticeText}>Formanı doldurmaq üçün əvvəlcə arayışları yükləyin. Bunun üçün internet lazımdır.</Text>
        <Button small label={residents.refreshing ? 'Yüklənir…' : 'Arayışları yüklə'} disabled={!residents.store || !residents.online || residents.refreshing} onPress={() => void residents.refreshCatalog()} /></View>}
      {!!(residents.error || localError) && <Text accessibilityRole="alert" style={styles.error}>{localError || residents.error}</Text>}
      {!!residents.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{residents.notice}</Text>}
      <View style={styles.sources}>{([['device', 'Cihazda'], ['server', 'Serverdə']] as const).map(([value, label]) =>
        <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: source === value }} onPress={() => setSource(value)} style={[styles.source, source === value && styles.activeSource]}>
          <Text style={[styles.sourceText, source === value && { color: '#FFF' }]}>{label}</Text></Pressable>)}</View>
      <View style={styles.card}>{source === 'server' ? <ServerList wide={wide} /> : <>
        <View style={styles.toolbar}><View style={styles.filters}>{([['pending', 'Sinxronlaşmamış'], ['synced', 'Sinxronlaşmış'], ['all', 'Hamısı']] as const).map(([value, label]) =>
          <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => { setFilter(value); setSelection([]); }} style={[styles.tab, filter === value && styles.activeTab]}><Text style={[styles.tabText, filter === value && { color: colors.primary }]}>{label}</Text></Pressable>)}</View>
          <TextInput accessibilityLabel="Ad, FİN və ya hesab nömrəsinə görə axtarış" placeholder="Ad, FİN və ya hesab №" value={query} onChangeText={value => { setQuery(value); setSelection([]); }} style={[ui.input, styles.search]} placeholderTextColor={colors.muted} /></View>
        <View style={styles.selectRow}><Check label={selected.length ? `${selected.length} qeyd seçilib` : 'Hamısını seç'} checked={selectable.length > 0 && selected.length === selectable.length}
          disabled={!selectable.length || residents.syncing} onChange={() => setSelection(selected.length === selectable.length ? [] : selectable)} />
          <Text style={styles.catalogText}>{visible.length} qeyd</Text></View>
        {wide && <View style={styles.tableHeader}><Text style={styles.nameColumn}>Şəxsin məlumatları</Text><Text style={styles.addressColumn}>Ünvan</Text><Text style={styles.statusColumn}>Sinxronizasiya</Text></View>}
        {residents.loading ? <ActivityIndicator style={{ margin: 40 }} color={colors.primary} /> : <FlatList data={visible} keyExtractor={item => item.id} style={{ flex: 1 }}
          contentContainerStyle={!visible.length ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>≡</Text><Text style={styles.emptyTitle}>{query ? 'Qeyd tapılmadı' : filter === 'pending' ? 'Sinxronlaşmamış qeyd yoxdur' : 'Hələ qeyd yoxdur'}</Text><Text style={styles.emptyText}>Yeni şəxsi əlavə edin. Qeydləri internet olmadan doldurub daha sonra seçərək sinxron edə bilərsiniz.</Text></View>}
          renderItem={({ item }) => {
            const p = item.data.personal, name = [p.lastName, p.firstName, p.fatherName].filter(Boolean).join(' ') || 'Yeni müvəqqəti yaşayan şəxs';
            const notice = draftNotice(item), canSelect = selectable.includes(item.id);
            const syncLabel = item.lastError && !notice ? 'Sinxronizasiya alınmadı' : pending(item) ? item.server ? 'Dəyişiklik göndərilməyib' : 'Sinxronlaşmayıb' : 'Sinxronlaşıb';
            const tone = item.lastError && !notice ? styles.badgeError : pending(item) ? styles.badgePending : styles.badgeDone;
            return <View style={[styles.row, wide && { flexDirection: 'row', alignItems: 'center' }]}>
              <View style={[styles.rowMain, wide && styles.nameColumn]}>
                <View style={{ width: 28 }}><Check label="" checked={selected.includes(item.id)} disabled={!canSelect || residents.syncing} onChange={() => setSelection(selected.includes(item.id) ? selection.filter(id => id !== item.id) : [...selection, item.id])} /></View>
                <Pressable accessibilityRole="button" accessibilityLabel={`${name}: formanı aç`} onPress={() => router.push({ pathname: '/temporary-residents/[id]', params: { id: item.id } })}
                  onLongPress={() => setMenu(item)} style={{ flex: 1, paddingVertical: 8 }}>
                  <Text style={styles.name}>{name}</Text><Text style={styles.detail}>FİN: {String(p.fin || '—')} · {item.data.reportYear}</Text><Text style={styles.detail}>Şəxsi hesab № {item.server?.personalAccountNumber || 'sinxronizasiyadan sonra veriləcək'}</Text>
                </Pressable>
                {!wide && <Pressable accessibilityRole="button" accessibilityLabel={`${name}: əməliyyatlar`} onPress={() => setMenu(item)} style={styles.more}><Text style={styles.moreText}>⋮</Text></Pressable>}
              </View>
              <Text style={[styles.address, wide && styles.addressColumn]}>{residents.catalog?.adminUnits.find(x => x.id === item.data.adminUnitId)?.label || 'Ünvan seçilməyib'}</Text>
              <View style={[styles.statusBox, wide && styles.statusColumn]}>
                <Text style={[styles.badge, tone]}>{syncLabel}</Text>
                {notice && <Text style={[styles.badge, notice.tone === 'danger' ? styles.badgeError : notice.tone === 'warning' ? styles.badgePending : styles.badgeInfo]}>{notice.badge}</Text>}
                {item.server?.downloaded && <Text style={[styles.badge, styles.badgeInfo]}>Serverdən endirilib</Text>}
                {!!item.lastError && !notice && <Text style={styles.errorDetail}>{item.lastError}</Text>}
              </View>
              {wide && <Pressable accessibilityRole="button" accessibilityLabel={`${name}: əməliyyatlar`} onPress={() => setMenu(item)} style={styles.more}><Text style={styles.moreText}>⋮</Text></Pressable>}
            </View>;
          }} />}
      </>}</View>
      {source === 'device' && <View style={styles.bottom}><Text style={styles.bottomText}>Yalnız seçilmiş qeydlər göndəriləcək.</Text><Button label={residents.syncing ? `Sinxron edilir… ${residents.progress}` : `Seçilənləri sinxron et${selected.length ? ` (${selected.length})` : ''}`}
        disabled={!residents.online || !selected.length || residents.syncing || !residents.catalog} onPress={() => void residents.sync(selected)} /></View>}
    </View>
    {menu && <ActionSheet title={[menu.data.personal.lastName, menu.data.personal.firstName].filter(Boolean).join(' ') || 'Yeni müvəqqəti yaşayan şəxs'}
      subtitle={draftNotice(menu)?.title} onClose={() => setMenu(null)} items={[
        { label: editable(menu) ? 'Redaktə et' : 'Bax', onPress: () => { setMenu(null); router.push({ pathname: '/temporary-residents/[id]', params: { id: menu.id } }); } },
        ...menu.conflict ? [{ label: 'Fərqlərə bax və qərar ver', onPress: () => { setMenu(null); router.push({ pathname: '/temporary-residents/conflict/[id]', params: { id: menu.id } }); } }] : [],
        { label: menu.server ? 'Cihazdan çıxar' : 'Qaralamanı sil', danger: true, disabled: residents.syncing,
          hint: menu.server && !menu.deleted ? 'Hesabat serverdə qalır, yalnız bu cihazdan silinir.' : undefined,
          onPress: () => { setRemoving(menu); setMenu(null); } },
      ]} />}
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
  safe: { flex: 1, backgroundColor: colors.primary }, topbar: { minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, brand: { backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }, logo: { width: 104, height: 32 }, profile: { flexShrink: 1, minHeight: 48, justifyContent: 'center' }, profileText: { color: '#FFF', fontSize: 13 },
  page: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 14 }, breadcrumb: { color: colors.muted, fontSize: 12, lineHeight: 19 }, titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }, title: { fontSize: 23, lineHeight: 31, color: colors.text, fontWeight: '600' }, subtitle: { fontSize: 13, color: colors.muted, marginTop: 4 }, connection: { flexDirection: 'row', alignItems: 'center', gap: 8 }, dot: { height: 7, width: 7, borderRadius: 4 }, connectionText: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  catalogRow: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }, catalogText: { color: colors.muted, fontSize: 12, lineHeight: 19 }, card: { flex: 1, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', minHeight: 180 }, toolbar: { padding: 14, gap: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }, filters: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' }, tab: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 5 }, activeTab: { backgroundColor: colors.pale }, tabText: { color: colors.muted, fontSize: 12, fontWeight: '500' }, search: { flex: 1, minWidth: 210 }, selectRow: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 16 }, nameColumn: { flex: 1.5, color: colors.muted, fontSize: 12 }, addressColumn: { flex: 1, color: colors.muted, fontSize: 12, paddingHorizontal: 12 }, statusColumn: { width: 180, color: colors.muted, fontSize: 12 }, row: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 }, rowMain: { flexDirection: 'row', gap: 12, alignItems: 'center' }, name: { color: colors.primary, fontSize: 14, fontWeight: '600', lineHeight: 22 }, detail: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18 }, address: { color: colors.text, fontSize: 13, lineHeight: 21 }, statusBox: { gap: 6, alignItems: 'flex-start' }, badge: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 5, fontSize: 11, fontWeight: '600' }, errorDetail: { color: '#B91C1C', fontSize: 12, lineHeight: 18 },
  sources: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 3, gap: 3 }, source: { minHeight: 40, minWidth: 104, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 6 }, activeSource: { backgroundColor: colors.primary }, sourceText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  badgeDone: { color: '#15803D', backgroundColor: '#F0FDF4' }, badgePending: { color: '#9A3412', backgroundColor: '#FFF7ED' }, badgeError: { color: '#B91C1C', backgroundColor: '#FEF2F2' }, badgeInfo: { color: '#1D4ED8', backgroundColor: '#EFF6FF' },
  more: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, moreText: { color: colors.primary, fontSize: 24, fontWeight: '700' },
  catalogNotice: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', borderRadius: 8, padding: 12, gap: 10, alignItems: 'flex-start' }, catalogNoticeText: { color: '#9A3412', fontSize: 13, lineHeight: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 }, emptyIcon: { color: '#94A3B8', fontSize: 38 }, emptyTitle: { fontSize: 17, color: colors.text, textAlign: 'center', fontWeight: '500' }, emptyText: { color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 420 }, bottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, bottomText: { color: colors.muted, fontSize: 12 }, error: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 6, color: '#B91C1C', lineHeight: 21 }, notice: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 6, color: '#1D4ED8', lineHeight: 21 },
});

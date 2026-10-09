import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../App';
import { Button, colors, ui } from '../components/ResidentControls';
import { useResidents } from './context';
import { listServerResidents } from './server';
import { RecordHeader, RecordRow, type RowChip } from '../components/RecordRow';
import { chipTone } from '../components/StatusChip';
import { ServerActions } from './ServerActions';
import type { ServerResidentItem } from './types';

/** Reports on the server with the operator's online actions. Rows are not cached; a report is stored only once checked out. */
export function ServerList({ wide }: { wide: boolean }) {
  const auth = useAuth(), residents = useResidents();
  // getAccessToken is recreated on every auth render; reading it through a ref keeps load stable.
  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);
  const [query, setQuery] = useState(''), [search, setSearch] = useState('');
  const [items, setItems] = useState<ServerResidentItem[]>([]), [page, setPage] = useState(0), [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const request = useRef(0);
  const [menu, setMenu] = useState<ServerResidentItem | null>(null), [notice, setNotice] = useState('');
  const onDevice = useMemo(() => new Set(residents.drafts.flatMap(x => x.server ? [x.server.reportId, x.server.rootReportId] : [])), [residents.drafts]);
  const load = useCallback(async (pageNumber: number) => {
    const id = ++request.current;
    try {
      const accessToken = await authRef.current.getAccessToken();
      if (id !== request.current) return;
      setLoading(true); setError('');
      const result = await listServerResidents(accessToken, search, pageNumber);
      if (id !== request.current) return;
      setItems(current => pageNumber === 1 ? result.items : [...current, ...result.items]);
      setPage(result.pageNumber); setTotalPages(result.totalPages); setTotal(result.totalCount);
    } catch (cause) { if (id === request.current) setError(cause instanceof Error ? cause.message : 'Serverdəki qeydlər yüklənmədi.'); }
    finally { if (id === request.current) setLoading(false); }
  }, [search]);
  useEffect(() => {
    // Offline renders its own notice; dropping the pending request is enough here.
    if (!residents.online) { request.current++; return; }
    const timer = setTimeout(() => void load(1), 0);
    return () => clearTimeout(timer);
  }, [residents.online, load]);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);
  if (!residents.online) return <View style={styles.empty}><Text style={styles.emptyIcon}>⌁</Text><Text style={styles.emptyTitle}>İnternet bağlantısı yoxdur</Text>
    <Text style={styles.emptyText}>Serverdəki qeydlərə yalnız onlayn baxmaq olar. Cihazdakı qeydlərlə internetsiz işləməyə davam edə bilərsiniz.</Text></View>;
  return <>
    <View style={styles.toolbar}><TextInput accessibilityLabel="Serverdəki qeydlərdə axtarış" placeholder="Ad, FİN və ya hesab №" value={query} onChangeText={setQuery}
      returnKeyType="search" onSubmitEditing={() => setSearch(query.trim())} style={[ui.input, styles.search]} placeholderTextColor={colors.muted} />
      <Text style={styles.muted}>{page ? `${total} qeyd` : ''}</Text></View>
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
    {!!error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button small secondary label="Yenidən cəhd et" onPress={() => void load(page && items.length ? page + 1 : 1)} /></View>}
    {wide && <RecordHeader columns={['Şəxsin məlumatları', 'Daimi yaşadığı yer', 'Status']} />}
    <FlatList data={items} keyExtractor={item => String(item.reportId)} style={{ flex: 1 }} contentContainerStyle={!items.length ? { flexGrow: 1 } : undefined}
      refreshing={loading && page <= 1 && items.length > 0} onRefresh={() => void load(1)}
      onEndReachedThreshold={0.4} onEndReached={() => { if (!loading && !error && page < totalPages) void load(page + 1); }}
      ListEmptyComponent={loading ? <ActivityIndicator style={{ margin: 40 }} color={colors.primary} /> : error ? null : <View style={styles.empty}><Text style={styles.emptyIcon}>≡</Text>
        <Text style={styles.emptyTitle}>{search ? 'Qeyd tapılmadı' : 'Serverdə qeyd yoxdur'}</Text></View>}
      ListFooterComponent={loading && items.length ? <ActivityIndicator style={{ margin: 16 }} color={colors.primary} /> : null}
      renderItem={({ item }) => {
        const chips: RowChip[] = [{ label: item.workflowStatus, tone: chipTone(item.workflowTone) }];
        if (onDevice.has(item.reportId)) chips.push({ label: 'Bu cihazda var', tone: 'neutral' });
        return <RecordRow wide={wide} title={item.fullName || 'Şəxsin məlumatları daxil edilməyib'} chips={chips}
          meta={[`Hesab № ${item.accountNumber}`, item.birthDate, item.gender].filter(Boolean).join(' · ')} address={item.permanentResidence || '—'}
          onOpen={() => router.push({ pathname: '/temporary-residents/server/[reportId]', params: { reportId: String(item.reportId) } })}
          onMenu={() => { setNotice(''); setMenu(item); }} />;
      }} />
    {menu && <ServerActions item={menu} onClose={() => setMenu(null)} onDone={text => { setMenu(null); setNotice(text); void load(1); }} />}
  </>;
}
const styles = StyleSheet.create({
  toolbar: { padding: 14, gap: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line }, search: { flex: 1, minWidth: 210 }, muted: { color: colors.muted, fontSize: 12 },
  errorBox: { margin: 14, gap: 10, alignItems: 'flex-start' }, error: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 6, color: '#B91C1C', lineHeight: 21, alignSelf: 'stretch' },
  notice: { margin: 14, marginBottom: 0, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 6, color: '#1D4ED8', lineHeight: 21 }, 
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 }, emptyIcon: { color: '#94A3B8', fontSize: 38 }, emptyTitle: { fontSize: 17, color: colors.text, textAlign: 'center', fontWeight: '500' }, emptyText: { color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 420 },
});

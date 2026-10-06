import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, colors } from '../components/ResidentControls';
import { useResidents } from './context';
import { diffResident } from './present';
import { StateBanner } from './StateBanner';

// Alert.alert has no buttons on web; the preview harness and web builds confirm with the browser dialog.
function confirm(title: string, text: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') { if (globalThis.confirm?.(`${title}\n\n${text}`)) onConfirm(); return; }
  Alert.alert(title, text, [{ text: 'Ləğv et', style: 'cancel' }, { text: action, style: 'destructive', onPress: onConfirm }]);
}

/** The operator's decision on a record the server refused: keep theirs, take the server's, or decide later. */
export default function ConflictScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), residents = useResidents(), wide = useWindowDimensions().width >= 761;
  const draft = residents.drafts.find(x => x.id === id), catalog = residents.catalog;
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const differences = useMemo(() => draft?.conflict && catalog ? diffResident(draft.data, draft.conflict.server.data, catalog) : [], [draft, catalog]);
  const back = () => router.canGoBack() ? router.back() : router.replace('/temporary-residents');
  if (!draft?.conflict || !catalog) return <SafeAreaView style={[styles.safe, { padding: 24, gap: 20 }]}>
    <Text style={styles.title}>{draft ? 'Bu qeyd üzrə gözləyən qərar yoxdur.' : 'Qeyd tapılmadı.'}</Text><Button label="Siyahıya qayıt" onPress={() => router.replace('/temporary-residents')} /></SafeAreaView>;
  const { conflict } = draft, state = conflict.server.state, locked = conflict.code === 'REPORT_LOCKED';
  async function run(work: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Əməliyyat tamamlanmadı.'); } finally { setBusy(false); }
  }
  const sendMine = () => confirm('Server versiyası əvəz olunsun?', 'Serverdəki məlumat bu cihazdakı ilə tam əvəz olunacaq, aşağıdakı fərqlər daxil olmaqla.', 'Mənimkini göndər',
    () => void run(async () => {
      const result = await residents.sync([draft.id], { confirmOverwrite: true });
      // A newer server change during the decision opens this screen again with the new differences.
      if (result && !result.conflicts) back();
    }));
  const takeServer = () => confirm('Cihazdakı dəyişikliklər silinsin?', 'Bu cihazda edilmiş və göndərilməmiş dəyişikliklər silinəcək, serverdəki məlumat yüklənəcək. Bu geri qaytarıla bilməz.', 'Server versiyasını götür',
    () => void run(async () => { await residents.adoptServer(draft.id); back(); }));
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Təsərrüfat № {conflict.server.accountNumber}</Text>
      <Text style={styles.headerHint}>Sinxronizasiya qərarı · Status: {state.statusName}</Text></View><Button secondary small label="✕  Bağla" onPress={back} /></View>
    <ScrollView contentContainerStyle={styles.content}><View style={styles.inner}>
      <StateBanner tone={locked ? 'danger' : 'warning'} title={conflict.message}
        text={[state.returnReason && `Səbəb: ${state.returnReason}`, locked ? 'Redaktə bağlıdır. Server versiyasını götürə və ya qeydi cihazda saxlaya bilərsiniz; hesabat geri qaytarılsa, yenidən göndərmək mümkün olacaq.'
          : 'Göndərsəniz, serverdəki məlumat bu cihazdakı ilə əvəz olunacaq.'].filter(Boolean).join('\n')} />
      {!!(error || residents.error) && <Text accessibilityRole="alert" style={styles.error}>{error || residents.error}</Text>}
      <View style={styles.card}><Text style={styles.cardTitle}>Fərqlər ({differences.length})</Text>
        {wide && !!differences.length && <View style={[styles.diff, styles.diffHead]}><Text style={styles.labelCol}>Sahə</Text><Text style={styles.valueCol}>Bu cihazda</Text><Text style={styles.valueCol}>Serverdə</Text></View>}
        {differences.length ? differences.map((d, i) => <View key={`${d.section}-${d.label}-${i}`} style={[styles.diff, !wide && { flexDirection: 'column', gap: 6 }]}>
          <View style={wide ? styles.labelCol : undefined}><Text style={styles.section}>{d.section}</Text><Text style={styles.label}>{d.label}</Text></View>
          <Text style={[styles.value, wide && styles.valueCol]}>{!wide && <Text style={styles.muted}>Bu cihazda: </Text>}{d.local || '—'}</Text>
          <Text style={[styles.value, wide && styles.valueCol, { color: '#1D4ED8' }]}>{!wide && <Text style={styles.muted}>Serverdə: </Text>}{d.server || '—'}</Text>
        </View>) : <Text style={[styles.value, { padding: 16 }]}>Məlumatlarda fərq yoxdur; dəyişən yalnız hesabatın statusu və ya versiyasıdır.</Text>}
      </View>
    </View></ScrollView>
    <View style={styles.footer}>
      <Button secondary label="Serverdəkinə bax" disabled={!residents.online} onPress={() => router.push({ pathname: '/temporary-residents/server/[reportId]', params: { reportId: String(state.reportId) } })} />
      <Button secondary label="Server versiyasını götür" disabled={busy || !residents.online} onPress={takeServer} />
      <Button secondary label={locked ? 'Cihazda saxla' : 'Sonra'} disabled={busy} onPress={back} />
      {!locked && <Button label={busy ? 'Göndərilir…' : 'Mənimkini göndər'} disabled={busy || !residents.online} onPress={sendMine} />}
    </View>
    {!residents.online && <Text style={[styles.muted, { textAlign: 'center', paddingBottom: 12 }]}>Qərarı icra etmək üçün internetə qoşulun.</Text>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' }, title: { color: colors.text, fontSize: 20, lineHeight: 28, fontWeight: '600' },
  header: { minHeight: 80, borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, headerTitle: { color: colors.text, fontSize: 16, fontWeight: '500', lineHeight: 24 }, headerHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  content: { padding: 20, alignItems: 'center' }, inner: { width: '100%', maxWidth: 820, gap: 20 }, error: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 12, borderRadius: 6, lineHeight: 21 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, overflow: 'hidden' }, cardTitle: { backgroundColor: '#F8FAFC', color: colors.text, fontSize: 15, fontWeight: '600', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  diff: { flexDirection: 'row', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }, diffHead: { backgroundColor: '#FFF', paddingVertical: 10 },
  labelCol: { flex: 1.2, color: colors.muted, fontSize: 12 }, valueCol: { flex: 1, color: colors.muted, fontSize: 12 },
  section: { color: colors.muted, fontSize: 11, lineHeight: 16 }, label: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '500' }, value: { color: colors.text, fontSize: 14, lineHeight: 21 }, muted: { color: colors.muted, fontSize: 12 },
  footer: { borderTopWidth: 1, borderTopColor: colors.line, padding: 16, gap: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' },
});

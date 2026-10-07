import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../App';
import { Button, colors } from '../components/ResidentControls';
import { useResidents } from './context';
import { ResidentView } from './ResidentView';
import { StateBanner } from './StateBanner';
import { getServerResident } from './server';
import type { ServerResidentDetail } from './types';

/** Read-only view of a server report. It is fetched on open and kept only in memory. */
export default function ServerDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>(), residents = useResidents(), auth = useAuth();
  const [detail, setDetail] = useState<ServerResidentDetail | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);
  useEffect(() => {
    if (!residents.online) return;
    let cancelled = false;
    void authRef.current.getAccessToken().then(token => getServerResident(token, Number(reportId)))
      .then(value => { if (!cancelled) setDetail(value); })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Qeyd yüklənmədi.'); });
    return () => { cancelled = true; };
  }, [reportId, residents.online, attempt]);
  const catalog = residents.catalog;
  const back = () => router.canGoBack() ? router.back() : router.replace('/temporary-residents');
  const message = !detail && (!residents.online ? 'Serverdəki qeydə baxmaq üçün internetə qoşulun.' : error)
    || (!catalog ? 'Məlumatları göstərmək üçün əvvəlcə arayışları onlayn yükləyin.' : '');
  if (residents.catalogLoading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ margin: 40 }} /></SafeAreaView>;
  if (message) return <SafeAreaView style={[styles.safe, { padding: 24, gap: 20 }]}><Text style={styles.title}>{message}</Text>
    <View style={styles.actions}>{!!error && residents.online && <Button secondary label="Yenidən cəhd et" onPress={() => { setError(''); setAttempt(x => x + 1); }} />}<Button label="Geri" onPress={back} /></View></SafeAreaView>;
  if (!detail || !catalog) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ margin: 40 }} /></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Təsərrüfat № {detail.accountNumber}</Text>
      <Text style={styles.headerHint}>Serverdəki qeyd · yalnız baxış · {detail.state.statusName}</Text></View><Button secondary small label="✕  Bağla" onPress={back} /></View>
    <ResidentView data={detail.data} accountNumber={detail.accountNumber} address={detail.address} catalog={catalog}
      banner={detail.state.returnReason ? <StateBanner tone="warning" title={`${detail.state.statusName}`} text={`Səbəb: ${detail.state.returnReason}`} /> : null} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' }, title: { color: colors.text, fontSize: 20, lineHeight: 28, fontWeight: '600' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  header: { minHeight: 80, borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, headerTitle: { color: colors.text, fontSize: 16, fontWeight: '500', lineHeight: 24 }, headerHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
});

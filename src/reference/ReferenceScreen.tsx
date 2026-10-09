import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Button, Chevron, colors } from '../components/ResidentControls';
import { Notice, ProgressBar } from '../components/Notice';
import { progressPercent, useReference } from './context';
import { listSummary } from './labels';

const count = (value: number) => value.toLocaleString('az-AZ');
const date = (value: string) => new Date(value).toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' });
const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString('az-AZ', { maximumFractionDigits: 1 })} MB`;

/** Everything about the offline reference data: what is on the device, how old it is, and refreshing each part. */
export default function ReferenceScreen() {
  const reference = useReference(), { catalog, addresses } = reference;
  const [showLists, setShowLists] = useState(false);
  const lists = useMemo(() => catalog ? listSummary(catalog) : [], [catalog]);
  const disabled = !reference.online || !!reference.refreshing;
  const progress = progressPercent(reference.progress) / 100, partial = reference.refreshing !== 'addresses' ? reference.partial : null;
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Arayışlar</Text>
      <Text style={styles.headerHint}>{reference.online ? 'Onlayn' : 'Oflayn'} · formalar bu məlumatlarla internetsiz doldurulur</Text></View>
      <Button secondary small label="✕  Bağla" onPress={back} /></View>
    <ScrollView contentContainerStyle={styles.page}>
      {!!reference.error && <Notice tone="danger" title={reference.failed === 'addresses' ? 'Ünvanlar yüklənmədi' : 'Arayışlar yenilənmədi'}
        text={`${reference.error}${reference.failed === 'addresses' ? ' Yükləmə qaldığı yerdən davam edəcək: internet qayıdanda özü, ya da «Yüklə» ilə.' : ''}`} onClose={reference.dismiss} />}
      {!reference.online && <Notice compact tone="warning" text="Yeniləmək üçün internetə qoşulun. Cihazdakı arayışlarla işləməyə davam edə bilərsiniz." />}

      <View style={styles.card}>
        <View style={styles.cardHead}><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Formaların siyahıları</Text>
          <Text style={styles.muted}>{catalog ? `${lists.length} siyahı · ${date(catalog.downloadedAt)}` : 'Hələ yüklənməyib'}</Text></View>
          <Button small secondary={!!catalog} label={reference.refreshing === 'lists' ? 'Yüklənir…' : catalog ? 'Yenilə' : 'Yüklə'} disabled={disabled}
            onPress={() => void (catalog ? reference.refreshLists() : reference.refreshAll())} /></View>
        {!!catalog && <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showLists }} onPress={() => setShowLists(x => !x)} style={styles.toggle}>
            <Text style={styles.link}>{showLists ? 'Siyahıları gizlət' : 'Siyahılara bax'}</Text><Chevron up={showLists} color={colors.primary} /></Pressable>
          {showLists && <View style={styles.table}>{lists.map(item => <View key={item.name} style={styles.row}>
            <Text style={styles.rowName}>{item.name}</Text><Text style={styles.rowValue}>{count(item.count)}</Text></View>)}</View>}
        </>}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Ünvanlar</Text>
          <Text style={styles.muted}>{addresses ? `${megabytes(addresses.bytes)} · ${date(addresses.downloadedAt)}` : partial ? 'Yarımçıq qalıb' : 'Hələ yüklənməyib'}</Text></View>
          <Button small secondary={!!addresses && !partial} label={reference.refreshing === 'addresses' ? 'Yüklənir…' : partial ? 'Davam et' : addresses ? 'Yenilə' : 'Yüklə'}
            disabled={disabled || !catalog} onPress={() => void reference.refreshAddresses()} /></View>
        {reference.refreshing === 'addresses' && <View style={{ gap: 6 }}>
          <ProgressBar value={progress} />
          <Text style={styles.muted}>{reference.progress ? `${count(reference.progress.done)} / ${count(reference.progress.total)} sətir` : 'Başlanır…'} · Bu vaxt tətbiqdən istifadə edə bilərsiniz.</Text>
        </View>}
        {!!partial && <View style={{ gap: 6 }}>
          <ProgressBar value={progressPercent(partial) / 100} />
          <Text style={styles.muted}>{addresses ? 'Yeniləmə yarımçıq qalıb' : 'Yarımçıq'} · {progressPercent(partial)}% ({count(partial.done)} / {count(partial.total)} sətir) ·{' '}
            {reference.online ? '«Davam et» ilə qaldığı yerdən yüklənəcək.' : 'İnternet qayıdanda özü davam edəcək.'}
            {addresses ? ' Bu vaxt əvvəlki ünvanlar istifadə olunur.' : ''}</Text>
        </View>}
        {!!addresses && <View style={styles.table}>{([['İnzibati ərazilər', addresses.counts.adminUnits], ['Küçələr', addresses.counts.streets],
          ['Binalar / girişlər', addresses.counts.entrances]] as const).map(([name, value]) => <View key={name} style={styles.row}>
          <Text style={styles.rowName}>{name}</Text><Text style={styles.rowValue}>{count(value)}</Text></View>)}</View>}
        {!catalog && <Text style={styles.muted}>Ünvanlar formaların siyahılarından sonra yüklənir.</Text>}
        {!!catalog && !addresses && !partial && reference.refreshing !== 'addresses' && <Text style={styles.muted}>
          Ünvan reyestri bütün ölkə üzrədir və bir neçə dəqiqəyə yüklənir. Kəsilsə, qaldığı yerdən davam edir.</Text>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { minHeight: 72, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 24 }, headerHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  page: { padding: 16, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 }, cardTitle: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 }, link: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  table: { borderTopWidth: 1, borderTopColor: colors.line },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowName: { flex: 1, color: colors.text, fontSize: 13 }, rowValue: { color: colors.text, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

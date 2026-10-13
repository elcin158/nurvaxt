import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors } from '../components/ResidentControls';
import type { HistoryItem } from '../temporary-residents/types';
import type { HistoryEvent } from './events';

const SOURCES: Record<number, string> = { 1: 'Web', 2: 'Mobil', 3: 'İnteqrasiya' };
const time = (value: string) => new Date(value).toLocaleString('az-AZ');
const mapUrl = (latitude: number, longitude: number) =>
  `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=18/${latitude.toFixed(6)}/${longitude.toFixed(6)}`;
type Row = { kind: 'local'; event: HistoryEvent } | { kind: 'server'; item: HistoryItem };

/**
 * A record's history: the step saves still on the device, marked unsent, above the server's
 * history. `load` reads the server's; without it (offline, or a record never sent) `note` says why.
 */
export function HistorySheet({ title, local = [], load, note, onClose }: {
  title: string; local?: HistoryEvent[]; load?: () => Promise<HistoryItem[]>; note?: string; onClose(): void;
}) {
  const [server, setServer] = useState<HistoryItem[] | null>(load ? null : []), [error, setError] = useState('');
  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    load().then(items => { if (!cancelled) setServer(items); })
      .catch(cause => { if (!cancelled) { setServer([]); setError(cause instanceof Error ? cause.message : 'Tarixçə yüklənmədi.'); } });
    return () => { cancelled = true; };
    // Loaded once for the record the sheet was opened for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rows: Row[] = [...[...local].reverse().map(event => ({ kind: 'local' as const, event })), ...(server ?? []).map(item => ({ kind: 'server' as const, item }))];
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Button secondary label="Bağla" onPress={onClose} /></View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!note && <Text style={styles.note}>{note}</Text>}
      {server === null ? <ActivityIndicator style={{ margin: 40 }} color={colors.primary} /> : <FlatList data={rows}
        keyExtractor={(row, index) => row.kind === 'local' ? row.event.id : `${row.item.actionDate}-${index}`}
        ListEmptyComponent={<Text style={styles.muted}>Tarixçə boşdur.</Text>}
        renderItem={({ item: row }) => row.kind === 'local' ? <View style={styles.row}>
          <View style={styles.titleRow}><Text style={styles.label}>Redaktə</Text><Text style={styles.badge}>Göndərilməyib</Text></View>
          <Text style={styles.muted}>Cihazda: {time(row.event.at)}</Text>
          <Text style={styles.value}>{row.event.step}</Text>
          <Location latitude={row.event.location?.latitude} longitude={row.event.location?.longitude} accuracy={row.event.location?.accuracy}
            missing="GPS məkanı gözlənilir" />
        </View> : <View style={styles.row}>
          <Text style={styles.label}>{row.item.action}</Text>
          <Text style={styles.muted}>{time(row.item.actionDate)}{row.item.actorName ? ` · ${row.item.actorName}` : ''}</Text>
          <Text style={styles.muted}>{row.item.previousStatus} → {row.item.newStatus}</Text>
          {!!row.item.description && <Text style={styles.value}>{row.item.description}</Text>}
          <Text style={styles.muted}>{SOURCES[row.item.source ?? 1] ?? 'Web'}{row.item.deviceActionDate ? ` · Cihazda: ${time(row.item.deviceActionDate)}` : ''}</Text>
          <Location latitude={row.item.latitude} longitude={row.item.longitude} accuracy={row.item.locationAccuracy} />
        </View>} />}
    </SafeAreaView>
  </Modal>;
}
function Location({ latitude, longitude, accuracy, missing }: { latitude?: number | null; longitude?: number | null; accuracy?: number | null; missing?: string }) {
  if (latitude == null || longitude == null) return missing ? <Text style={[styles.muted, { color: '#C2410C' }]}>{missing}</Text> : null;
  return <Pressable accessibilityRole="link" accessibilityLabel="Məkanı xəritədə aç" onPress={() => void Linking.openURL(mapUrl(latitude, longitude))}>
    <Text style={styles.link}>{latitude.toFixed(6)}, {longitude.toFixed(6)}{accuracy != null ? ` · ±${Math.round(accuracy)} m` : ''}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF', padding: 20, gap: 12 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '600', flexShrink: 1 }, row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { color: '#9A3412', backgroundColor: '#FFF7ED', borderColor: '#FDBA74', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, fontSize: 11, overflow: 'hidden' },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' }, value: { color: colors.text, fontSize: 14, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 }, link: { color: colors.primary, fontSize: 12, lineHeight: 18, textDecorationLine: 'underline' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19, backgroundColor: colors.bg, padding: 10, borderRadius: 6 },
  error: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 10, borderRadius: 6, lineHeight: 20 },
});

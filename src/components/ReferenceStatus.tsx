import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { progressPercent, useReference } from '../reference/context';
import { Button, colors } from './ResidentControls';
import { Notice, ProgressBar } from './Notice';

type Reference = ReturnType<typeof useReference>;
const percent = (reference: Reference) => progressPercent(reference.progress);

/** The reference data's state in a few words, for the header menu: what is missing or happening. */
export function referenceSummary(reference: Reference): { tone: 'ok' | 'busy' | 'warning'; text: string } {
  if (reference.refreshing === 'lists') return { tone: 'busy', text: 'Siyahılar yüklənir…' };
  if (reference.refreshing === 'addresses') return { tone: 'busy', text: `Ünvanlar yüklənir · ${percent(reference)}%` };
  if (reference.loading) return { tone: 'busy', text: 'Açılır…' };
  if (reference.partial) return { tone: 'warning', text: `Ünvanlar yarımçıq · ${progressPercent(reference.partial)}%` };
  if (!reference.catalog) return { tone: 'warning', text: 'Yüklənməyib' };
  if (!reference.addresses) return { tone: 'warning', text: 'Ünvanlar yüklənməyib' };
  if (reference.error) return { tone: 'warning', text: 'Son yeniləmə alınmadı' };
  return { tone: 'ok', text: 'Hazırdır' };
}

/**
 * The reference data on a module's list, kept out of the way: nothing when it is ready, a slim
 * progress line while it downloads, and a one-line prompt only when something is missing or failed.
 * Every line opens the reference data screen with the details.
 */
export function ReferenceStatus() {
  const reference = useReference(), details = () => router.push('/reference');
  if (reference.refreshing) {
    const addresses = reference.refreshing === 'addresses';
    return <Pressable accessibilityRole="button" accessibilityLabel="Arayışların yüklənməsi, ətraflı" onPress={details} style={styles.progress}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{addresses ? `Ünvanlar yüklənir · ${percent(reference)}%` : 'Formaların siyahıları yüklənir…'}</Text>
        <Text style={styles.more}>›</Text>
      </View>
      {addresses && <ProgressBar value={percent(reference) / 100} />}
    </Pressable>;
  }
  // An interrupted address download says how far it got and that it will carry on.
  if (reference.partial && reference.catalog) return <Notice compact tone="warning"
    text={`${reference.addresses ? 'Ünvanların yenilənməsi' : 'Ünvanlar'} yarımçıq qalıb · ${progressPercent(reference.partial)}%`} onClose={reference.error ? reference.dismiss : undefined}
    action={reference.online ? <Button compact label="Davam et" onPress={() => void reference.refreshAddresses()} />
      : <Text style={styles.offline}>İnternet qayıdanda davam edəcək</Text>} />;
  if (reference.error) return <Notice compact tone="danger" text={reference.failed === 'addresses' ? 'Ünvanlar yüklənmədi.' : 'Arayışlar yenilənmədi.'}
    onClose={reference.dismiss} action={<Button compact secondary label="Ətraflı" onPress={details} />} />;
  if (reference.notice) return <Notice compact tone="success" text={reference.notice} onClose={reference.dismiss} />;
  if (reference.loading) return null;
  if (!reference.catalog) return <Notice compact tone="warning" text="Formanı internetsiz doldurmaq üçün arayışları yükləyin."
    action={reference.online ? <Button compact label="Yüklə" onPress={() => void reference.refreshAll()} /> : <Text style={styles.offline}>İnternet lazımdır</Text>} />;
  if (!reference.addresses) return <Notice compact tone="warning" text="Ünvanlar yüklənməyib; ünvan sahələri boş qalacaq."
    action={reference.online ? <Button compact label="Yüklə" onPress={() => void reference.refreshAddresses()} /> : <Text style={styles.offline}>İnternet lazımdır</Text>} />;
  return null;
}

/** A module's own error and result messages, each closable. */
export function PageMessages({ error, notice, onClose }: { error?: string; notice?: string; onClose(): void }) {
  return <>
    {!!error && <Notice tone="danger" text={error} onClose={onClose} />}
    {!error && !!notice && <Notice tone="success" text={notice} onClose={onClose} />}
  </>;
}

const styles = StyleSheet.create({
  progress: { gap: 6, paddingVertical: 4 }, progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressText: { color: colors.primary, fontSize: 13, fontWeight: '500' }, more: { color: colors.primary, fontSize: 18, lineHeight: 20 },
  offline: { color: colors.muted, fontSize: 12 },
});

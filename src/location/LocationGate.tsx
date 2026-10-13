import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors } from '../components/ResidentControls';
import { type Access, accessMessage, checkAccess, openSettings, requestAccess } from './gps';

/**
 * Editing records every step save with a GPS position, so a form opens for editing only with
 * precise location allowed and on. The app explains why before the system asks, because iOS asks
 * only once; what the app cannot ask for again is sent to the settings. Checked on every entry
 * and on every return to the app, since the permission can be taken back at any time.
 */
export function LocationGate({ children, onCancel }: { children: ReactNode; onCancel(): void }) {
  const [access, setAccess] = useState<Access | null>(null), [asking, setAsking] = useState(false);
  useEffect(() => {
    let live = true;
    const check = () => void checkAccess().then(value => { if (live) setAccess(value); }).catch(() => { if (live) setAccess('services-off'); });
    check();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    return () => { live = false; subscription.remove(); };
  }, []);
  if (access === 'granted') return <>{children}</>;
  if (access === null) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ margin: 40 }} /></SafeAreaView>;
  // Only the settings can lift a refusal iOS will not ask about again, or turn on precise location there.
  const settings = access === 'blocked' || Platform.OS === 'ios' && (access === 'approximate' || access === 'services-off');
  async function ask() {
    setAsking(true);
    try { setAccess(await requestAccess()); } finally { setAsking(false); }
  }
  return <SafeAreaView style={styles.safe}><View style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>GPS məkanı tələb olunur</Text>
    <Text style={styles.text}>{accessMessage[access]}</Text>
    <View style={styles.actions}>
      <Button secondary label="Geri" onPress={onCancel} />
      {settings ? <Button label="Ayarlara keç" onPress={openSettings} />
        : <Button label={asking ? 'Gözləyin…' : 'Davam et'} disabled={asking} onPress={() => void ask()} />}
    </View>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 24, gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center', borderWidth: 1, borderColor: colors.line },
  title: { color: colors.text, fontSize: 18, fontWeight: '600' },
  text: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 6 },
});

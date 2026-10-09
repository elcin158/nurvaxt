import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Notice } from '../components/Notice';
import { useAppUpdate, versionLabel } from './useAppUpdate';

const blue = '#007BFF';

/**
 * Announces a newer build over every screen: a dismissible bar at the bottom, or, below the oldest
 * supported version, a screen that cannot be passed. Updating in place keeps the device's records,
 * so the required screen does not wait for unsent data.
 */
export function UpdateNotice() {
  const update = useAppUpdate(), insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!update || (!update.required && dismissed === update.latest)) return null;
  const url = update.downloadUrl;
  const download = url ? () => { void Linking.openURL(url).catch(() => undefined); } : undefined;

  if (update.required) return <View style={[styles.cover, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
    <View style={styles.card}>
      <Text style={styles.title}>Tətbiqi yeniləyin</Text>
      <Text style={styles.text}>Bu versiya artıq dəstəklənmir. Davam etmək üçün {update.latest} versiyasını quraşdırın.
        Cihazdakı məlumatlar yeniləmədən sonra qalır.</Text>
      {download ? <Pressable accessibilityRole="button" onPress={download} style={({ pressed }) => [styles.button, pressed && styles.dim]}>
        <Text style={styles.buttonText}>Yeni versiyanı yüklə</Text></Pressable>
        : <Text style={styles.text}>Yeni versiyanı almaq üçün administratorla əlaqə saxlayın.</Text>}
      <Text style={styles.version}>Hazırkı versiya {versionLabel}</Text>
    </View>
  </View>;

  return <View pointerEvents="box-none" style={[styles.bar, { bottom: insets.bottom + 12 }]}>
    <View style={styles.barInner}><Notice tone="info" title="Yeni versiya mövcuddur" text={`${update.latest} versiyasını quraşdırmağınız tövsiyə olunur.`}
      onClose={() => setDismissed(update.latest)}
      action={download && <Pressable accessibilityRole="button" onPress={download} hitSlop={8}>
        <Text style={styles.link}>Yüklə</Text></Pressable>} /></View>
  </View>;
}

const styles = StyleSheet.create({
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#E5EDF9', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#FFF', borderRadius: 16, padding: 28, gap: 12,
    shadowColor: '#152C52', shadowOpacity: 0.12, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  title: { fontSize: 20, fontWeight: '600', color: '#1E2A3A', textAlign: 'center' },
  text: { fontSize: 14, lineHeight: 21, color: '#6B7A8C', textAlign: 'center' },
  button: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: blue, padding: 12, marginTop: 8 },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '600' }, dim: { opacity: 0.5 },
  version: { fontSize: 11, color: '#B4BECA', textAlign: 'center', marginTop: 4 },
  bar: { position: 'absolute', left: 16, right: 16, alignItems: 'center' }, barInner: { width: '100%', maxWidth: 560 },
  link: { color: blue, fontSize: 14, fontWeight: '600' },
});

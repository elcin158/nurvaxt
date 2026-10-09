import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, colors } from './ResidentControls';
import { Notice } from './Notice';

const SLOW_AFTER_MS = 6_000;

/**
 * What a server record's review screen shows until the record is there: the form's own header with
 * its close, so one can leave at any moment, and a centred spinner. A load that drags on gets a note
 * with a retry; a failed one or a missing precondition gets a message in its place.
 */
export function DetailPlaceholder({ title, loadingText, message, error, onRetry, onClose, attempt = 0 }: {
  title: string; loadingText: string; message?: string; error?: string; onRetry?(): void; onClose(): void; attempt?: number;
}) {
  // Remembers which attempt ran long, so a retry starts quiet again.
  const loading = !message && !error, [slowAttempt, setSlowAttempt] = useState<number | null>(null), slow = loading && slowAttempt === attempt;
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlowAttempt(attempt), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [loading, attempt]);
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.headerTitle}>{title}</Text>
      <Text style={styles.headerHint}>Serverdəki qeyd · yalnız baxış</Text></View>
      <Button secondary small label="✕  Bağla" onPress={onClose} /></View>
    <View style={styles.body}>
      {loading ? <View accessibilityRole="progressbar" accessibilityLabel={loadingText} style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{loadingText}</Text>
        {slow && <View style={styles.slow}><Notice tone="warning" title="Yükləmə gözləniləndən uzun çəkir"
          text="İnternet bağlantısı zəif ola bilər. Gözləyə, yenidən cəhd edə və ya geri qayıda bilərsiniz." />
          <View style={styles.actions}>{onRetry && <Button secondary label="Yenidən cəhd et" onPress={onRetry} />}<Button label="Geri" onPress={onClose} /></View></View>}
      </View> : <View style={styles.message}>
        <Notice tone={error ? 'danger' : 'warning'} title={error ? 'Qeyd yüklənmədi' : undefined} text={error || message} />
        <View style={styles.actions}>{!!error && onRetry && <Button secondary label="Yenidən cəhd et" onPress={onRetry} />}<Button label="Geri" onPress={onClose} /></View>
      </View>}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  header: { minHeight: 80, borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '500', lineHeight: 24 }, headerHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  body: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  loadingText: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  slow: { width: '100%', maxWidth: 480, gap: 12, marginTop: 10 },
  message: { padding: 24, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});

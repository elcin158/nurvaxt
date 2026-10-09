import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './ResidentControls';

const tones = {
  info: { accent: '#0F62FE', background: '#F3F8FF', text: '#1E3A8A', icon: 'i' },
  success: { accent: '#16A34A', background: '#F2FBF5', text: '#14532D', icon: '✓' },
  warning: { accent: '#EA580C', background: '#FFF8F1', text: '#7C2D12', icon: '!' },
  danger: { accent: '#DC2626', background: '#FFF5F5', text: '#7F1D1D', icon: '!' },
};
export type NoticeTone = keyof typeof tones;

/**
 * A page-level message: a toned bar with an icon, optional title, action and close button.
 * `compact` keeps it to one line with the action beside the text, for a list page's top.
 */
export function Notice({ tone, title, text, action, onClose, children, compact }: {
  tone: NoticeTone; title?: string; text?: string; action?: ReactNode; onClose?(): void; children?: ReactNode; compact?: boolean;
}) {
  const t = tones[tone];
  return <View accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={[styles.box, compact && styles.compactBox, { backgroundColor: t.background, borderLeftColor: t.accent }]}>
    <View style={[styles.icon, compact && styles.compactIcon, { backgroundColor: t.accent }]}><Text style={styles.iconText}>{t.icon}</Text></View>
    <View style={[styles.body, compact && styles.compactBody]}>
      {!!title && <Text style={[styles.title, { color: t.text }]}>{title}</Text>}
      {!!text && <Text style={[styles.text, compact && styles.compactText, { color: t.text }]}>{text}</Text>}
      {children}
      {action}
    </View>
    {onClose && <Pressable accessibilityRole="button" accessibilityLabel="Bağla" hitSlop={8} onPress={onClose} style={[styles.close, compact && { marginTop: 0 }]}>
      <Text style={[styles.closeText, { color: t.text }]}>×</Text></Pressable>}
  </View>;
}

/** A thin bar for a known share of work done. */
export function ProgressBar({ value }: { value: number }) {
  return <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }]} /></View>;
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 8, borderLeftWidth: 4, paddingVertical: 12, paddingLeft: 12, paddingRight: 8,
    borderWidth: 1, borderColor: colors.line },
  icon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  iconText: { color: '#FFF', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  body: { flex: 1, minWidth: 0, gap: 6, alignItems: 'flex-start' },
  title: { fontSize: 14, fontWeight: '600', lineHeight: 20 }, text: { fontSize: 13, lineHeight: 19 },
  compactBox: { alignItems: 'center', paddingVertical: 6 }, compactIcon: { width: 18, height: 18, marginTop: 0 },
  compactBody: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 6 }, compactText: { flexShrink: 1 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: -6 }, closeText: { fontSize: 22, lineHeight: 24, opacity: 0.7 },
  track: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: '#DBE7FB', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#0F62FE' },
});

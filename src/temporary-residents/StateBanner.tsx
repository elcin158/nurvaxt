import { StyleSheet, Text, View } from 'react-native';
import type { ResidentDraft } from './types';

const tones = {
  warning: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74', color: '#9A3412' },
  danger: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' },
  info: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD', color: '#1D4ED8' },
};
export function StateBanner({ tone, title, text }: { tone: keyof typeof tones; title: string; text?: string }) {
  const t = tones[tone];
  return <View accessibilityRole="alert" style={[styles.box, { backgroundColor: t.backgroundColor, borderColor: t.borderColor }]}>
    <Text style={[styles.title, { color: t.color }]}>{title}</Text>{!!text && <Text style={[styles.text, { color: t.color }]}>{text}</Text>}</View>;
}
/** What the operator must know about a device record's server report, most urgent first. */
export function draftNotice(draft: ResidentDraft): { tone: keyof typeof tones; title: string; text?: string; badge: string } | null {
  const status = draft.status;
  if (draft.deleted) return { tone: 'danger', badge: 'Serverdə silinib', title: 'Hesabat serverdə silinib',
    text: 'Bu qeyd artıq sinxron edilə bilməz. Məlumatlar yalnız bu cihazda qalıb.' };
  if (draft.conflict) return { tone: 'warning', badge: 'Qərar gözləyir', title: draft.conflict.message,
    text: 'Fərqlərə baxıb hansı versiyanın qalacağına qərar verin.' };
  if (status && !status.canEdit) return { tone: 'danger', badge: 'Redaktə bağlıdır', title: `Hesabat «${status.statusName}» statusundadır`,
    text: 'Redaktə bağlıdır. Hesabat geri qaytarılsa, yenidən redaktə edə biləcəksiniz.' };
  if (status?.returnReason != null || status?.status === 4 || status?.status === 6) return { tone: 'warning', badge: 'Geri qaytarılıb',
    title: `${status.statusName}`, text: status.returnReason ? `Səbəb: ${status.returnReason}` : undefined };
  if (status?.changed) return { tone: 'info', badge: 'Serverdə yenilənib', title: 'Hesabat serverdə dəyişdirilib',
    text: 'Göndərəndə fərqlər göstəriləcək və qərar verəcəksiniz.' };
  return null;
}
const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 4 }, title: { fontSize: 14, fontWeight: '600', lineHeight: 21 }, text: { fontSize: 13, lineHeight: 20 },
});

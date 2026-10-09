import { StyleSheet, Text } from 'react-native';

// Tbu.Web's .status-chip: the same tones and colours, so a status reads the same on both.
const tones = {
  success: { color: '#15803D', backgroundColor: '#DCFCE7' },
  warning: { color: '#C2410C', backgroundColor: '#FFEDD5' },
  danger: { color: '#DC2626', backgroundColor: '#FEE2E2' },
  info: { color: '#0F62FE', backgroundColor: '#E5F1FF' },
  neutral: { color: '#64748B', backgroundColor: '#F1F5F9' },
};
export type ChipTone = keyof typeof tones;
export const chipTone = (value: string | null | undefined): ChipTone => value && value in tones ? value as ChipTone : 'neutral';

export function StatusChip({ label, tone }: { label: string; tone: ChipTone }) {
  return <Text numberOfLines={1} style={[styles.chip, tones[tone]]}>{label}</Text>;
}

/** A household status's tone, as Tbu.Web's HouseholdStatusBadge draws it. */
export function householdTone(status: number): ChipTone {
  if (status === 3) return 'success';
  if (status === 2 || status === 5) return 'warning';
  if (status === 4 || status === 6) return 'danger';
  if (status === 1) return 'info';
  return 'neutral';
}
/** A temporary resident report's tone, as Tbu.Web's resident list draws it: completed or not. */
export const residentTone = (status: number): ChipTone => status === 3 ? 'success' : 'warning';

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', minHeight: 22, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, fontSize: 13, lineHeight: 18, fontWeight: '600', overflow: 'hidden' },
});

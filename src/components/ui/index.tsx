import type { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { tokens, useTheme } from '../../theme';
import { latestCoverage } from '../../database/coverage';
export function AppText({
  children,
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: 'body' | 'title' | 'heading' | 'caption' | 'number' }) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[{ color: colors.text, fontFamily: tokens.font.medium }, styles[variant], style]}
    >
      {children}
    </Text>
  );
}
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Icon({
  name,
  color,
  size = 22,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  color?: string;
  size?: number;
}) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.primary} accessible={false} />;
}
export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        backgroundColor: colors.surface,
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
      })}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 16,
        paddingHorizontal: 24,
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: secondary ? colors.elevated : colors.primary,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        alignItems: 'center',
      })}
    >
      <AppText
        style={{
          color: secondary ? colors.primary : colors.background,
          fontFamily: tokens.font.bold,
        }}
      >
        {title}
      </AppText>
    </Pressable>
  );
}
export function Chip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
        backgroundColor: selected ? colors.primary : colors.elevated,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <AppText variant="caption" style={{ color: selected ? colors.background : colors.text }}>
        {title}
      </AppText>
    </Pressable>
  );
}
export function EmptyState({ error = false }: { error?: boolean }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ gap: 16, alignItems: 'center', paddingVertical: 16 }}>
        <Icon name={error ? 'alert-circle-outline' : 'calendar-outline'} size={32} />
        <AppText variant="heading">
          {error ? 'Məlumat açıla bilmədi' : 'Bu tarix üçün təqvim yoxdur'}
        </AppText>
        <AppText style={{ color: colors.muted, textAlign: 'center', lineHeight: 24 }}>
          {error
            ? 'Təqvim məlumatları yoxlanarkən xəta baş verdi. Tətbiqi yenidən açın.'
            : `Seçilmiş şəhər və tarix üçün yoxlanmış QMİ vaxtları hələ əlavə edilməyib. Mövcud paket: ${latestCoverage}.`}
        </AppText>
      </View>
    </Card>
  );
}
const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 23 },
  title: { fontSize: 30, lineHeight: 40, fontFamily: tokens.font.bold, letterSpacing: -1 },
  heading: { fontSize: 19, lineHeight: 28, fontFamily: tokens.font.bold },
  caption: { fontSize: 13, lineHeight: 20 },
  number: {
    fontSize: 24,
    lineHeight: 34,
    fontFamily: tokens.font.semibold,
    fontVariant: ['tabular-nums'],
  },
});

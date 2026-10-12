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
          padding: 20,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.035,
          shadowRadius: 16,
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
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
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
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 16,
        paddingHorizontal: 24,
        minHeight: 52,
        borderRadius: 18,
        backgroundColor: secondary ? colors.elevated : colors.primary,
        borderWidth: 1,
        borderColor: secondary ? colors.border : colors.primary,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        alignItems: 'center',
      })}
    >
      <AppText
        style={{
          color: secondary ? colors.primary : colors.onPrimary,
          fontFamily: tokens.font.bold,
        }}
      >
        {title}
      </AppText>
    </Pressable>
  );
}
export function ChoiceGroup({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        padding: 4,
        borderRadius: 16,
        backgroundColor: colors.elevated,
      }}
    >
      {children}
    </View>
  );
}
export function Chip({
  title,
  selected,
  onPress,
  segment = false,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  segment?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={title}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: segment ? 12 : 14,
        paddingHorizontal: segment ? 12 : 14,
        paddingVertical: 12,
        minHeight: 48,
        ...(segment ? { flexGrow: 1, flexBasis: 0, minWidth: 64 } : {}),
        backgroundColor: pressed
          ? colors.pressed
          : selected
            ? segment
              ? colors.surface
              : colors.selected
            : segment
              ? 'transparent'
              : colors.surface,
        borderWidth: 1,
        borderColor: segment || selected ? 'transparent' : colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: segment && selected ? 0.06 : 0,
        shadowRadius: 5,
      })}
    >
      {!segment && selected && <Icon name="checkmark" size={15} color={colors.selectedText} />}
      <AppText
        variant="caption"
        style={{
          color: selected ? colors.selectedText : colors.muted,
          fontFamily: tokens.font.semibold,
          textAlign: 'center',
          flexShrink: 1,
        }}
      >
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

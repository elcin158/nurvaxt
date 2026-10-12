import type { PropsWithChildren } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { useTheme } from '../../theme';
export function SettingsRow({
  title,
  subtitle,
  onPress,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string; onPress?: () => void }>) {
  const { colors } = useTheme();
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 6,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText>{title}</AppText>
        {subtitle && (
          <AppText variant="caption" style={{ color: colors.muted }}>
            {subtitle}
          </AppText>
        )}
      </View>
      {children ??
        (onPress ? <Icon name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <Switch
      {...(Platform.OS === 'web'
        ? { activeThumbColor: value ? colors.onPrimary : colors.secondary }
        : {})}
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={value ? colors.onPrimary : colors.secondary}
    />
  );
}

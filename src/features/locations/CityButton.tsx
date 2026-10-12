import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppText, Icon } from '../../components/ui';
import { usePreferences } from '../../store/preferences';
import { locationName } from './locations';
import { useTheme } from '../../theme';
export function CityButton({ compact = false }: { compact?: boolean }) {
  const city = usePreferences((s) => s.locationId);
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Şəhəri dəyiş: ${locationName(city)}`}
      onPress={() => router.push('/cities')}
      style={({ pressed }) => ({
        minHeight: compact ? 44 : 68,
        flexDirection: 'row',
        alignItems: 'center',
        gap: compact ? 6 : 12,
        paddingHorizontal: compact ? 10 : 14,
        paddingVertical: compact ? 8 : 10,
        borderRadius: compact ? 14 : 18,
        backgroundColor: pressed ? colors.pressed : compact ? 'transparent' : colors.surface,
        borderWidth: compact ? 0 : 1,
        borderColor: colors.border,
        ...(compact ? { flexShrink: 1 } : {}),
      })}
    >
      <View
        style={{
          width: compact ? 16 : 40,
          height: compact ? 20 : 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          backgroundColor: compact ? 'transparent' : colors.selected,
        }}
      >
        <Icon
          name="location-outline"
          size={compact ? 16 : 20}
          color={compact ? colors.muted : colors.selectedText}
        />
      </View>
      <View style={compact ? { flexShrink: 1 } : { flex: 1, gap: 1 }}>
        {!compact && (
          <AppText variant="caption" style={{ color: colors.muted }}>
            Şəhər və rayon
          </AppText>
        )}
        <AppText
          variant={compact ? 'caption' : 'body'}
          numberOfLines={compact ? 1 : undefined}
          style={{ color: compact ? colors.muted : colors.selectedText }}
        >
          {locationName(city)}
        </AppText>
      </View>
      <Icon
        name={compact ? 'chevron-down' : 'chevron-forward'}
        size={compact ? 12 : 18}
        color={colors.muted}
      />
    </Pressable>
  );
}

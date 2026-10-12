import { Pressable, useWindowDimensions, View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { LABELS, PRAYER_FIELDS } from '../../constants/prayers';
import { prayerIcons } from '../prayer-times/prayerIcons';
import { usePreferences } from '../../store/preferences';
import { tokens, useTheme } from '../../theme';

export function TimeVisibilitySettings() {
  const fields = usePreferences((state) => state.visibleFields);
  const toggleField = usePreferences((state) => state.toggleField);
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const twoColumns = width >= 375 && fontScale < 1.3;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {PRAYER_FIELDS.map((field) => {
        const selected = fields.includes(field);
        return (
          <Pressable
            key={field}
            accessibilityRole="checkbox"
            accessibilityLabel={LABELS[field]}
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            onPress={() => toggleField(field)}
            style={({ pressed }) => ({
              width: twoColumns ? '48%' : '100%',
              flexGrow: 1,
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: pressed ? colors.pressed : colors.background,
            })}
          >
            <Icon name={prayerIcons[field]} size={18} color={colors.secondary} />
            <AppText
              variant="caption"
              style={{
                flex: 1,
                fontFamily: tokens.font.semibold,
                color: selected ? colors.text : colors.muted,
              }}
            >
              {LABELS[field]}
            </AppText>
            <Icon
              name={selected ? 'checkbox' : 'square-outline'}
              size={19}
              color={selected ? colors.selectedText : colors.muted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

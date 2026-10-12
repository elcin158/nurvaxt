import { memo } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { LABELS, PRAYER_FIELDS, type PrayerField } from '../../constants/prayers';
import { prayerIcons } from './prayerIcons';
import type { PrayerDay } from '../../types/data';
import { usePreferences } from '../../store/preferences';
import { tokens, useTheme } from '../../theme';
import { formatTime } from '../../utils/time';
export const PrayerList = memo(function PrayerList({
  day,
  upcoming,
  ending = false,
  layout = 'list',
  onSelect,
}: {
  day: PrayerDay;
  upcoming?: PrayerField;
  ending?: boolean;
  layout?: 'list' | 'grid';
  onSelect?: (field: PrayerField) => void;
}) {
  const fields = usePreferences((s) => s.visibleFields);
  const format = usePreferences((s) => s.timeFormat);
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const visible = PRAYER_FIELDS.filter((field) => fields.includes(field) && day[field]);
  if (layout === 'grid') {
    const twoColumns =
      width >= 320 && fontScale < 1.3 && (format === '24' || (width >= 375 && fontScale < 1.15));
    return (
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
          }}
        >
          <AppText style={{ fontSize: 14, lineHeight: 22, fontFamily: tokens.font.semibold }}>
            Günün bütün vaxtları
          </AppText>
          <AppText variant="caption" style={{ fontSize: 11, lineHeight: 18, color: colors.muted }}>
            {visible.length} vaxt · {format === '24' ? '24 saat' : '12 saat'}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {visible.map((field, index) => {
            const highlighted = upcoming === field;
            const fullWidth =
              !twoColumns || (visible.length % 2 === 1 && index === visible.length - 1);
            return (
              <Pressable
                key={field}
                accessible
                accessibilityRole={onSelect ? 'button' : undefined}
                accessibilityLabel={`${LABELS[field]}, ${day[field]}${highlighted ? (ending ? ', vaxtı davam edir' : ', növbəti namaz') : ''}`}
                onPress={onSelect ? () => onSelect(field) : undefined}
                style={({ pressed }) => ({
                  flexBasis: fullWidth ? '100%' : '48%',
                  flexGrow: 1,
                  minHeight: fullWidth ? 46 : 66,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: width < 360 ? 8 : 10,
                  paddingVertical: fullWidth ? 8 : 9,
                  paddingHorizontal: width < 360 ? 10 : 12,
                  borderRadius: 16,
                  backgroundColor: pressed
                    ? colors.pressed
                    : highlighted
                      ? colors.selected
                      : colors.surface,
                  borderWidth: 1,
                  borderColor: highlighted ? colors.selectedBorder : 'transparent',
                })}
              >
                <Icon
                  name={prayerIcons[field]}
                  size={18}
                  color={highlighted ? colors.selectedText : colors.secondary}
                />
                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                    flexDirection: fullWidth ? 'row' : 'column',
                    flexWrap: fullWidth ? 'wrap' : 'nowrap',
                    alignItems: fullWidth ? 'center' : 'stretch',
                    justifyContent: 'space-between',
                    gap: fullWidth ? 8 : 2,
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{
                      fontSize: fullWidth ? 14 : 12,
                      lineHeight: fullWidth ? 22 : 18,
                      color: highlighted ? colors.selectedText : colors.muted,
                      ...(fullWidth ? { flexGrow: 1 } : {}),
                    }}
                  >
                    {LABELS[field]}
                  </AppText>
                  <AppText
                    variant="number"
                    style={{
                      fontSize: format === '12' ? 22 : 24,
                      lineHeight: 30,
                      letterSpacing: -0.6,
                      color: highlighted ? colors.selectedText : colors.text,
                    }}
                  >
                    {formatTime(day[field]!, format)}
                  </AppText>
                </View>
                {highlighted && (
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={{
                      position: 'absolute',
                      top: 9,
                      right: 9,
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: colors.selectedText,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 6,
      }}
    >
      {visible.map((field) => (
        <View
          key={field}
          accessible
          accessibilityLabel={`${LABELS[field]}, ${day[field]}${upcoming === field ? (ending ? ', vaxtı davam edir' : ', növbəti namaz') : ''}`}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 9,
            paddingHorizontal: 10,
            backgroundColor: upcoming === field ? colors.selected : colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'transparent',
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: upcoming === field ? colors.selectedIcon : colors.background,
              borderRadius: 12,
            }}
          >
            <Icon
              name={prayerIcons[field]}
              color={upcoming === field ? colors.selectedText : colors.secondary}
              size={20}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText
              style={{ fontFamily: upcoming === field ? tokens.font.bold : tokens.font.medium }}
            >
              {LABELS[field]}
            </AppText>
            {upcoming === field && (
              <AppText variant="caption" style={{ color: colors.selectedText }}>
                {ending ? 'Vaxtı davam edir' : 'Növbəti namaz'}
              </AppText>
            )}
          </View>
          <AppText
            variant="number"
            style={{
              fontSize: 22,
              color: upcoming === field ? colors.selectedText : colors.text,
              letterSpacing: -0.5,
              ...(fontScale >= 1.5 ? { width: '100%', textAlign: 'right' } : {}),
            }}
          >
            {formatTime(day[field]!, format)}
          </AppText>
        </View>
      ))}
    </View>
  );
});

import { Platform, Pressable, View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { usePreferences } from '../../store/preferences';
import { tokens, useTheme } from '../../theme';
import { REMINDER_SOUNDS, type ReminderSound } from '../notifications/sounds';
import { canPreviewSound, useSoundPreview } from '../notifications/useSoundPreview';

export function ReminderSoundSettings() {
  const sound = usePreferences((state) => state.reminders.sound);
  const { colors } = useTheme();
  const { playing, error, preview, stop } = useSoundPreview();
  const select = (next: ReminderSound) => {
    const prefs = usePreferences.getState();
    prefs.set({ reminders: { ...prefs.reminders, sound: next } });
    void preview(next);
  };
  return (
    <View style={{ gap: 10 }}>
      <AppText variant="heading">Bildiriş səsi</AppText>
      <AppText variant="caption" style={{ color: colors.muted, marginBottom: 4 }}>
        {Platform.OS === 'web'
          ? 'Səsi dinləmək üçün üzərinə gəlin və ya dinləmə düyməsinə basın.'
          : 'Seçdiyiniz səs dərhal səslənir. Seçmədən dinləmək üçün ▶ düyməsinə toxunun.'}
      </AppText>
      {REMINDER_SOUNDS.map((option) => {
        const selected = sound === option.id;
        const active = playing === option.id;
        const previewable = canPreviewSound(option.id);
        return (
          <View
            key={option.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.selected : colors.elevated,
            }}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={option.title}
              accessibilityHint={option.description}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => select(option.id)}
              onHoverIn={() => previewable && void preview(option.id)}
              onHoverOut={stop}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                minHeight: 68,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon
                name={
                  option.id === 'silent'
                    ? 'volume-mute-outline'
                    : active
                      ? 'volume-high'
                      : 'musical-note-outline'
                }
                color={selected ? colors.selectedText : colors.muted}
                size={22}
              />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontFamily: tokens.font.semibold }}>{option.title}</AppText>
                <AppText variant="caption" style={{ color: colors.muted }}>
                  {active ? 'Səslənir…' : option.description}
                </AppText>
              </View>
              {selected && <Icon name="checkmark-circle" size={20} />}
            </Pressable>
            {previewable && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${option.title}: ${active ? 'səsi dayandır' : 'dinlə'}`}
                onPress={() => (active ? stop() : void preview(option.id))}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  marginRight: 8,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? colors.pressed : colors.surface,
                })}
              >
                <Icon name={active ? 'stop' : 'play'} size={18} />
              </Pressable>
            )}
          </View>
        );
      })}
      {Platform.OS !== 'android' && (
        <AppText variant="caption" style={{ color: colors.muted }}>
          Standart səs telefonun sistem ayarları ilə idarə olunur; burada yalnız tətbiqin tonları
          dinlənir.
        </AppText>
      )}
      {error && (
        <AppText accessibilityLiveRegion="polite" variant="caption" style={{ color: colors.error }}>
          {error}
        </AppText>
      )}
    </View>
  );
}

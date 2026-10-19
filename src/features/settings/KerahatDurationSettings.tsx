import { useEffect, useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { usePreferences } from '../../store/preferences';
import { tokens, useTheme } from '../../theme';
import { MAX_KERAHAT_MINUTES, type KerahatWindow } from '../prayer-times/solar';

const periods = [
  { id: 'morning', title: 'Günçıxma' },
  { id: 'noon', title: 'Zəval' },
  { id: 'evening', title: 'Günbatımı' },
] as const;

function PeriodMinutes({ id, title }: { id: KerahatWindow['id']; title: string }) {
  const minutes = usePreferences((state) => state.kerahatDurations[id]);
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [draft, setDraft] = useState(String(minutes));
  const [invalid, setInvalid] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    setDraft(String(minutes));
    setInvalid(false);
  }, [minutes]);
  const accepted = (value: string) =>
    /^\d{1,3}$/.test(value) && Number(value) <= MAX_KERAHAT_MINUTES;
  const store = (value: number) => {
    const state = usePreferences.getState();
    state.set({ kerahatDurations: { ...state.kerahatDurations, [id]: value } });
  };
  const update = (value: number) => {
    store(value);
    setDraft(String(value));
    setInvalid(false);
  };
  // The panel scrolls with keyboardShouldPersistTaps="handled", so a tab or button takes the tap
  // without blurring the field. Keep every usable edit, not only the ones that blur.
  const edit = (value: string) => {
    setDraft(value);
    setInvalid(value.length > 0 && !accepted(value));
    if (accepted(value)) store(Number(value));
  };
  const commit = () => {
    if (!accepted(draft)) {
      setInvalid(true);
      return;
    }
    update(Number(draft));
  };
  const adjustmentButton = (direction: -1 | 1) => {
    const disabled = direction < 0 ? minutes === 0 : minutes === MAX_KERAHAT_MINUTES;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} kərahətini 5 dəqiqə ${direction < 0 ? 'azalt' : 'artır'}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          const current = usePreferences.getState().kerahatDurations[id];
          update(Math.min(MAX_KERAHAT_MINUTES, Math.max(0, current + direction * 5)));
        }}
        style={({ pressed }) => ({
          width: 44,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.pressed : 'transparent',
          opacity: disabled ? 0.35 : 1,
        })}
      >
        <Icon name={direction < 0 ? 'remove' : 'add'} size={18} />
      </Pressable>
    );
  };
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <AppText style={{ flex: 1, minWidth: 90 }}>{title}</AppText>
        <View
          style={{
            marginLeft: 'auto',
            maxWidth: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: invalid ? colors.error : focused ? colors.primary : colors.border,
            backgroundColor: colors.background,
            overflow: 'hidden',
          }}
        >
          {adjustmentButton(-1)}
          <TextInput
            accessibilityLabel={`${title} kərahəti, dəqiqə`}
            value={draft}
            onChangeText={edit}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commit();
            }}
            onSubmitEditing={commit}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            selectTextOnFocus
            maxLength={3}
            style={{
              width: 36 * fontScale,
              maxWidth: 96,
              flexShrink: 1,
              minHeight: 44,
              padding: 0,
              textAlign: 'center',
              color: colors.text,
              fontFamily: tokens.font.semibold,
              fontSize: 15,
              fontVariant: ['tabular-nums'],
            }}
          />
          <AppText variant="caption" style={{ color: colors.muted }}>
            dəq.
          </AppText>
          {adjustmentButton(1)}
        </View>
      </View>
      {invalid && (
        <AppText variant="caption" accessibilityLiveRegion="polite" style={{ color: colors.error }}>
          0–{MAX_KERAHAT_MINUTES} dəqiqə daxil edin.
        </AppText>
      )}
    </View>
  );
}

export function KerahatDurationSettings() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10, paddingVertical: 12 }}>
      <View style={{ gap: 3 }}>
        <AppText style={{ fontFamily: tokens.font.semibold }}>Kərahət müddətləri</AppText>
        <AppText variant="caption" style={{ color: colors.muted }}>
          Günçıxmadan sonra, Zöhrdən və günbatımından əvvəl sayılan dəqiqələr.
        </AppText>
      </View>
      {periods.map((period) => (
        <PeriodMinutes key={period.id} {...period} />
      ))}
      <AppText variant="caption" style={{ color: colors.muted }}>
        0 dəq. seçdikdə həmin kərahət göstərilmir və xatırlatması göndərilmir.
      </AppText>
    </View>
  );
}

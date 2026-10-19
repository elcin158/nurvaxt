import { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { AppText, Card, Chip } from '../src/components/ui';
import { SettingsRow, Toggle } from '../src/features/settings/SettingsRow';
import { ReminderSoundSettings } from '../src/features/settings/ReminderSoundSettings';
import { KerahatReminderSettings } from '../src/features/settings/KerahatReminderSettings';
import { usePreferences } from '../src/store/preferences';
import { LABELS, REMINDER_EVENTS } from '../src/constants/prayers';
import { tokens, useTheme } from '../src/theme';
function QuietTime({ field }: { field: 'start' | 'end' }) {
  const prefs = usePreferences();
  const [value, setValue] = useState(prefs.reminders.quietHours[field]);
  const [error, setError] = useState(false);
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <AppText variant="caption">{field === 'start' ? 'Başlanğıc' : 'Son'}</AppText>
      <TextInput
        accessibilityLabel={
          field === 'start'
            ? 'Səssiz saatların başlanğıcı, saat və dəqiqə'
            : 'Səssiz saatların sonu, saat və dəqiqə'
        }
        value={value}
        // The header close button takes the tap without blurring the field, so a complete time is
        // stored while it is typed instead of waiting for a blur that may never arrive.
        onChangeText={(next) => {
          setValue(next);
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(next)) return;
          setError(false);
          const r = usePreferences.getState().reminders;
          prefs.set({ reminders: { ...r, quietHours: { ...r.quietHours, [field]: next } } });
        }}
        placeholder="23:00"
        placeholderTextColor={colors.muted}
        maxLength={5}
        onBlur={() => {
          const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
          setError(!valid);
          if (valid) {
            const r = usePreferences.getState().reminders;
            prefs.set({ reminders: { ...r, quietHours: { ...r.quietHours, [field]: value } } });
          }
        }}
        style={{
          backgroundColor: colors.elevated,
          color: colors.text,
          padding: 16,
          borderRadius: 12,
          fontFamily: tokens.font.medium,
          fontSize: 18,
        }}
      />
      {error && (
        <AppText variant="caption" style={{ color: colors.error }}>
          Saatı HH:mm formatında yazın.
        </AppText>
      )}
    </View>
  );
}
export default function Reminders() {
  const prefs = usePreferences();
  const { colors } = useTheme();
  return (
    <Screen
      bottomSafeArea
      header={<ScreenHeader title="Xatırlatmalar" action="close" onBack={() => router.back()} />}
    >
      <AppText style={{ color: colors.muted }}>
        Namaz və kərahət vaxtları üçün bildiriş alın. Bir neçə xatırlatma vaxtını birlikdə seçə
        bilərsiniz. Seçdiyiniz hər vaxtda ayrıca xatırlatma gələcək.
      </AppText>
      <Card>
        <SettingsRow
          title="Namaz vaxtı bildirişi"
          subtitle="Beş gündəlik namazın vaxtı daxil olanda"
        >
          <Toggle
            label="Namaz vaxtı bildirişi"
            value={prefs.reminders.atPrayerTime}
            onChange={(atPrayerTime) =>
              prefs.set({ reminders: { ...prefs.reminders, atPrayerTime } })
            }
          />
        </SettingsRow>
        {Platform.OS === 'android' && (
          <SettingsRow
            title="Daimi vaxt göstəricisi"
            subtitle="Yuxarı sətirdə NurVaxt nişanı, son saatda ikonun altında qalan vaxt · paneldə iri canlı geri sayım"
          >
            <Toggle
              label="Daimi vaxt göstəricisi"
              value={prefs.reminders.ongoingCountdown}
              onChange={(ongoingCountdown) =>
                prefs.set({ reminders: { ...prefs.reminders, ongoingCountdown } })
              }
            />
          </SettingsRow>
        )}
        {!prefs.reminders.enabled && (
          <AppText variant="caption" style={{ color: colors.muted }}>
            İşləməsi üçün Ayarlarda bildirişləri aktivləşdirin.
          </AppText>
        )}
      </Card>
      {REMINDER_EVENTS.map((event) => (
        <Card key={event}>
          <AppText variant="heading" style={{ marginBottom: 16 }}>
            {LABELS[event]}
            {event === 'imsak' ? ' xatırlatması' : ''}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(event === 'imsak' ? [5, 10, 15, 0] : [5, 10, 15, 30]).map((offset) => (
              <Chip
                key={offset}
                title={offset ? `${offset} dəq. əvvəl` : 'Vaxtında'}
                selected={prefs.reminders.offsets[event].includes(offset)}
                onPress={() => prefs.toggleOffset(event, offset)}
              />
            ))}
          </View>
          <AppText variant="caption" style={{ marginTop: 16, color: colors.muted }}>
            {event !== 'imsak' && prefs.reminders.atPrayerTime
              ? 'Vaxtında bildiriş aktivdir. Seçilmiş dəqiqələrdə əlavə xatırlatma gələcək.'
              : event !== 'imsak'
                ? 'Namazdan əvvəl əlavə xatırlatma üçün dəqiqə seçin.'
                : prefs.reminders.offsets[event].length === 0
                  ? 'İmsak xatırlatması söndürülüb.'
                  : `${prefs.reminders.offsets[event].length} xatırlatma seçilib.`}
          </AppText>
        </Card>
      ))}
      <KerahatReminderSettings />
      <Card>
        <ReminderSoundSettings />
        <SettingsRow title="Vibrasiya">
          <Toggle
            label="Bildiriş vibrasiyası"
            value={prefs.reminders.vibration}
            onChange={(vibration) => prefs.set({ reminders: { ...prefs.reminders, vibration } })}
          />
        </SettingsRow>
        <AppText variant="caption" style={{ color: colors.muted }}>
          iOS-da vibrasiya sistem ayarları ilə idarə olunur.
        </AppText>
      </Card>
      <Card>
        <SettingsRow title="Səssiz saatlar" subtitle="Bu aralıqda xatırlatmalar göndərilmir">
          <Toggle
            label="Səssiz saatları aktivləşdir"
            value={prefs.reminders.quietHours.enabled}
            onChange={(enabled) =>
              prefs.set({
                reminders: {
                  ...prefs.reminders,
                  quietHours: { ...prefs.reminders.quietHours, enabled },
                },
              })
            }
          />
        </SettingsRow>
        {prefs.reminders.quietHours.enabled && (
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <QuietTime field="start" />
            <QuietTime field="end" />
          </View>
        )}
      </Card>
    </Screen>
  );
}

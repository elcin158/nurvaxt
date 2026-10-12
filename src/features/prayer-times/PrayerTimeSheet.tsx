import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppText, Button, IconButton } from '../../components/ui';
import {
  LABELS,
  REMINDER_EVENTS,
  type PrayerField,
  type ReminderEvent,
} from '../../constants/prayers';
import { locationName } from '../locations/locations';
import { usePreferences } from '../../store/preferences';
import { tokens, useTheme } from '../../theme';
import type { PrayerDay } from '../../types/data';
import { formatDate, formatTime } from '../../utils/time';

export function PrayerTimeSheet({
  day,
  field,
  onClose,
}: {
  day?: PrayerDay;
  field: PrayerField | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const format = usePreferences((state) => state.timeFormat);
  const visible = !!day && !!field && !!day[field];
  const canRemind = !!field && REMINDER_EVENTS.includes(field as ReminderEvent);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#02091C66' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vaxt təfərrüatını bağla"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <SafeAreaView
          edges={['bottom', 'left', 'right']}
          style={{
            width: '100%',
            maxWidth: 620,
            maxHeight: '85%',
            alignSelf: 'center',
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <View accessibilityViewIsModal style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <AppText variant="heading" style={{ flex: 1 }}>
                  {field ? LABELS[field] : ''}
                </AppText>
                <IconButton name="close" label="Bağla" onPress={onClose} />
              </View>
              {day && field && day[field] && (
                <>
                  <AppText
                    variant="number"
                    style={{
                      fontSize: 40,
                      lineHeight: 54,
                      letterSpacing: -1,
                      fontFamily: tokens.font.bold,
                    }}
                  >
                    {formatTime(day[field]!, format)}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.muted }}>
                    {locationName(day.locationId)} · {formatDate(day.date)}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.muted }}>
                    Mənbə: Qafqaz Müsəlmanları İdarəsi
                  </AppText>
                </>
              )}
              {canRemind && (
                <Button
                  title="Xatırlatmaları tənzimlə"
                  onPress={() => {
                    onClose();
                    router.push('/reminders');
                  }}
                />
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

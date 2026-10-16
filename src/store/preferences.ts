import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { z } from 'zod';
import {
  DEFAULT_VISIBLE_FIELDS,
  PRAYER_FIELDS,
  type PrayerField,
  type ReminderEvent,
} from '../constants/prayers';
import { defaultReminders, type ReminderPreferences } from '../features/notifications/domain';
import { REMINDER_SOUND_IDS } from '../features/notifications/sounds';
import { defaultKerahatDurations, MAX_KERAHAT_MINUTES } from '../features/prayer-times/solar';
const offsetSchema = z.array(z.number().int().min(0).max(120)).max(25);
// Zero hides that period, so the stored minutes keep their own per-period default.
const kerahatMinutes = (fallback: number) =>
  z.number().int().min(0).max(MAX_KERAHAT_MINUTES).default(fallback);
const preferencesSchema = z.object({
  locationId: z.string().regex(/^qmi-\d+$/),
  recentLocations: z.array(z.string()).max(5),
  theme: z.enum(['light', 'dark', 'system']),
  timeFormat: z.enum(['24', '12']),
  showHijri: z.boolean(),
  showKerahat: z.boolean().default(false),
  kerahatDurations: z
    .object({
      morning: kerahatMinutes(defaultKerahatDurations.morning),
      noon: kerahatMinutes(defaultKerahatDurations.noon),
      evening: kerahatMinutes(defaultKerahatDurations.evening),
    })
    .default(defaultKerahatDurations),
  hijriAdjustment: z.number().int().min(-2).max(2),
  visibleFields: z.array(z.enum(PRAYER_FIELDS)).min(1),
  // Defaulted so a stored preference file written before the Qibla screen still parses.
  qiblaSource: z.enum(['city', 'device']).default('city'),
  onboardingComplete: z.boolean(),
  reminders: z.object({
    enabled: z.boolean(),
    atPrayerTime: z.boolean().default(true),
    ongoingCountdown: z.boolean().default(true),
    offsets: z.object({
      imsak: offsetSchema,
      fajr: offsetSchema,
      dhuhr: offsetSchema,
      asr: offsetSchema,
      maghrib: offsetSchema,
      isha: offsetSchema,
    }),
    sound: z.enum(REMINDER_SOUND_IDS),
    vibration: z.boolean(),
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    }),
  }),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  locationId: 'qmi-1',
  recentLocations: [],
  theme: 'system',
  timeFormat: '24',
  showHijri: false,
  showKerahat: false,
  kerahatDurations: defaultKerahatDurations,
  hijriAdjustment: 0,
  visibleFields: [...DEFAULT_VISIBLE_FIELDS],
  qiblaSource: 'city',
  onboardingComplete: false,
  reminders: defaultReminders,
};
type State = Preferences & {
  hydrated: boolean;
  storageError: string | null;
  set: (value: Partial<Preferences>) => void;
  setLocation: (id: string) => void;
  toggleOffset: (event: ReminderEvent, offset: number) => void;
  toggleField: (field: PrayerField) => void;
};
export function restorePreferences(value: unknown): Preferences {
  const parsed = preferencesSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultPreferences;
}
export const usePreferences = create<State>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,
      hydrated: false,
      storageError: null,
      set: (value) => set(value),
      setLocation: (id) =>
        set({
          locationId: id,
          recentLocations: [id, ...get().recentLocations.filter((v) => v !== id)].slice(0, 5),
        }),
      toggleOffset: (event, offset) => {
        const reminders = get().reminders;
        const current = reminders.offsets[event];
        const updated: ReminderPreferences = {
          ...reminders,
          offsets: {
            ...reminders.offsets,
            [event]: current.includes(offset)
              ? current.filter((v) => v !== offset)
              : [...current, offset].sort((a, b) => a - b),
          },
        };
        set({ reminders: updated });
      },
      toggleField: (field) => {
        const fields = get().visibleFields;
        if (fields.length === 1 && fields.includes(field)) return;
        set({
          visibleFields: fields.includes(field)
            ? fields.filter((v) => v !== field)
            : [...fields, field],
        });
      },
    }),
    {
      name: 'nurvaxt-preferences',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        const {
          hydrated: _h,
          storageError: _e,
          set: _s,
          setLocation: _l,
          toggleOffset: _o,
          toggleField: _f,
          ...prefs
        } = state;
        return prefs;
      },
      merge: (persisted, current) => ({ ...current, ...restorePreferences(persisted) }),
      onRehydrateStorage: () => (_state, error) => {
        usePreferences.setState({
          hydrated: true,
          storageError: error ? 'Ayarlar yaddaşdan oxuna bilmədi.' : null,
        });
      },
    },
  ),
);

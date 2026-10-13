export const TIMEZONE = 'Asia/Baku';
export const PRAYER_FIELDS = [
  'imsak',
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'sunset',
  'maghrib',
  'isha',
  'midnight',
] as const;
export type PrayerField = (typeof PRAYER_FIELDS)[number];
export const DAILY_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export const REMINDER_EVENTS = ['imsak', ...DAILY_PRAYERS] as const;
export type ReminderEvent = (typeof REMINDER_EVENTS)[number];
export const LABELS: Record<PrayerField, string> = {
  imsak: 'İmsak',
  fajr: 'Sübh',
  sunrise: 'Günçıxma',
  dhuhr: 'Zöhr',
  asr: 'Əsr',
  sunset: 'Günbatımı',
  maghrib: 'Məğrib',
  isha: 'İşa',
  midnight: 'Gecəyarısı',
};

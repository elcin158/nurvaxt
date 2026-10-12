export const REMINDER_SOUND_IDS = ['silent', 'default', 'tone', 'soft', 'bell', 'melody'] as const;
export type ReminderSound = (typeof REMINDER_SOUND_IDS)[number];

export const REMINDER_SOUNDS: {
  id: ReminderSound;
  title: string;
  description: string;
  file: string | null;
}[] = [
  { id: 'silent', title: 'Səssiz', description: 'Yalnız bildiriş göstərilir', file: null },
  { id: 'default', title: 'Standart', description: 'Telefonun bildiriş səsi', file: null },
  { id: 'tone', title: 'Qısa ton', description: 'Qısa və aydın siqnal', file: 'nurvaxt_tone.wav' },
  {
    id: 'soft',
    title: 'Yumşaq ton',
    description: 'Sakit, yumşaq səslənmə',
    file: 'nurvaxt_soft.wav',
  },
  { id: 'bell', title: 'Zəng', description: 'İki yüngül zəng səsi', file: 'nurvaxt_bell.wav' },
  {
    id: 'melody',
    title: 'Melodiya',
    description: 'Üç notdan ibarət qısa melodiya',
    file: 'nurvaxt_melody.wav',
  },
];

export function notificationSound(sound: ReminderSound): false | string {
  if (sound === 'silent') return false;
  return REMINDER_SOUNDS.find((option) => option.id === sound)?.file ?? 'default';
}

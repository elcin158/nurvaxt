import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { PrayerField } from '../../constants/prayers';

export const prayerIcons: Record<PrayerField, ComponentProps<typeof Ionicons>['name']> = {
  imsak: 'moon-outline',
  fajr: 'partly-sunny-outline',
  sunrise: 'sunny-outline',
  dhuhr: 'sunny-outline',
  asr: 'time-outline',
  sunset: 'cloudy-night-outline',
  maghrib: 'moon-outline',
  isha: 'moon-outline',
  midnight: 'sparkles-outline',
};

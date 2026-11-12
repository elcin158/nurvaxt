import { DAILY_PRAYERS, LABELS } from '../../constants/prayers';
import type { PrayerDay } from '../../types/data';
import { atTime } from '../../utils/time';

export const WIDGET_VARIANTS = ['large', 'compact', 'small'] as const;
export type WidgetVariant = (typeof WIDGET_VARIANTS)[number];
export type WidgetPrayer = {
  field: (typeof DAILY_PRAYERS)[number];
  name: string;
  time: string;
  timestamp: number;
};
export type WidgetPlan = {
  version: 1;
  bundle: string;
  locationId: string;
  location: string;
  timeFormat: '12' | '24';
  days: { date: string; prayers: WidgetPrayer[] }[];
};

/** Keep the whole installed calendar so widgets need neither JS nor a network after launch. */
export function createWidgetPlan(
  days: PrayerDay[],
  options: Omit<WidgetPlan, 'version' | 'days'>,
): WidgetPlan {
  const verified = new Map(
    days
      .filter((day) => day.verified && day.locationId === options.locationId)
      .map((day) => [day.date, day]),
  );
  return {
    version: 1,
    ...options,
    days: [...verified.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => ({
        date: day.date,
        prayers: DAILY_PRAYERS.flatMap((field) => {
          const time = day[field];
          return time
            ? [{ field, name: LABELS[field], time, timestamp: atTime(day.date, time) }]
            : [];
        }),
      })),
  };
}

export function widgetRemaining(milliseconds: number): string {
  const minutes = Math.max(1, Math.ceil(Math.max(0, milliseconds) / 60_000));
  return minutes < 60 ? `${minutes} dəq` : `${Math.floor(minutes / 60)} s ${minutes % 60} dəq`;
}

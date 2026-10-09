import { useQuery } from '@tanstack/react-query';
import { readDays } from '../database/repository';
import { usePreferences } from '../store/preferences';
export function usePrayerDays(start: string, end = start) {
  const city = usePreferences((s) => s.locationId);
  return useQuery({
    queryKey: ['prayer-days', city, start, end],
    queryFn: () => readDays(city, start, end),
    staleTime: Infinity,
  });
}

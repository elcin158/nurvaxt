import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { bakuNow, todayISO } from '../utils/time';
export function useToday() {
  const [date, setDate] = useState(todayISO);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setDate(todayISO());
      const now = bakuNow();
      timer = setTimeout(
        refresh,
        Math.max(100, now.plus({ days: 1 }).startOf('day').toMillis() - now.toMillis()),
      );
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
      else clearTimeout(timer);
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);
  return date;
}

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
export function useActiveClock(interval = 1000) {
  const [now, setNow] = useState(Date.now);
  const focused = useIsFocused();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    function updateTimer() {
      if (timer) clearInterval(timer);
      if (focused && AppState.currentState === 'active') {
        setNow(Date.now());
        timer = setInterval(() => setNow(Date.now()), interval);
      }
    }
    updateTimer();
    const listener = AppState.addEventListener('change', updateTimer);
    return () => {
      if (timer) clearInterval(timer);
      listener.remove();
    };
  }, [focused, interval]);
  return now;
}

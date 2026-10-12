import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { ReminderSound } from './sounds';
import { previewSources } from './previewSources';

export function canPreviewSound(sound: ReminderSound) {
  return sound !== 'silent' && (sound !== 'default' || Platform.OS === 'android');
}

export function useSoundPreview() {
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [playing, setPlaying] = useState<ReminderSound | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    // The hook may already have released its native player during screen unmount.
    try {
      player.pause();
    } catch {
      /* A released player is already stopped. */
    }
    setPlaying(null);
  }, [player]);

  const preview = useCallback(
    async (sound: ReminderSound) => {
      stop();
      setError(null);
      if (!canPreviewSound(sound)) return;
      const request = generation.current;
      try {
        if (Platform.OS !== 'web') {
          await setAudioModeAsync({
            allowsRecording: false,
            playsInSilentMode: false,
            shouldPlayInBackground: false,
            interruptionMode: 'mixWithOthers',
          });
        }
        // A hover-out, newer choice, screen exit or background event cancels pending playback.
        if (request !== generation.current) return;
        player.replace(
          sound === 'default'
            ? { uri: 'content://settings/system/notification_sound' }
            : previewSources[sound as keyof typeof previewSources],
        );
        player.play();
        setPlaying(sound);
        timer.current = setTimeout(stop, 4000);
      } catch {
        if (request !== generation.current) return;
        stop();
        setError('Səs açıla bilmədi. Dinləmə düyməsinə yenidən toxunun.');
      }
    },
    [player, stop],
  );

  useEffect(() => {
    if (status.didJustFinish) stop();
  }, [status.didJustFinish, stop]);

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state !== 'active') stop();
      });
      return () => {
        subscription.remove();
        stop();
      };
    }, [stop]),
  );

  return { playing, error, preview, stop };
}

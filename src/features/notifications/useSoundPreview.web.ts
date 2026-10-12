import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Asset } from 'expo-asset';
import type { ReminderSound } from './sounds';
import { previewSources } from './previewSources';

export function canPreviewSound(sound: ReminderSound) {
  return sound !== 'silent' && sound !== 'default';
}

export function useSoundPreview() {
  const player = useRef<HTMLAudioElement | null>(null);
  const generation = useRef(0);
  const [playing, setPlaying] = useState<ReminderSound | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    if (player.current) {
      player.current.onended = null;
      player.current.onerror = null;
      player.current.pause();
      player.current.removeAttribute('src');
      player.current.load();
      player.current = null;
    }
    setPlaying(null);
  }, []);

  const preview = useCallback(
    async (sound: ReminderSound) => {
      stop();
      setError(null);
      if (!canPreviewSound(sound)) return;
      const request = generation.current;
      const fail = () => {
        if (request !== generation.current) return;
        stop();
        setError('Səsi dinləmək üçün ▶ düyməsinə basın.');
      };
      try {
        const asset = Asset.fromModule(previewSources[sound as keyof typeof previewSources]);
        const audio = new Audio(asset.uri);
        player.current = audio;
        audio.onended = stop;
        audio.onerror = fail;
        // Call play within the user gesture; hovering can be blocked until the first click.
        await audio.play();
        if (request === generation.current) setPlaying(sound);
      } catch {
        fail();
      }
    },
    [stop],
  );

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

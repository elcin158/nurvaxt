import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { ReminderSound } from './sounds';
import { previewSources } from './previewSources';
import Alarm from '../../../modules/nurvaxt-alarm/src';

const previewErrors = {
  silent: 'Telefonun standart bildiriş səsi səssizdir. Səs ayarlarından bildiriş səsi seçin.',
  muted: 'Telefonun bildiriş səsi bağlıdır. Səs ayarlarından bildiriş səsini artırın.',
  unavailable: 'Səs açıla bilmədi. Dinləmə düyməsinə yenidən toxunun.',
};

export function canPreviewSound(sound: ReminderSound) {
  return sound !== 'silent' && (sound !== 'default' || Platform.OS === 'android');
}

export function useSoundPreview() {
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [playing, setPlaying] = useState<ReminderSound | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playingSound = useRef<ReminderSound | null>(null);
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
    if (Platform.OS === 'android') Alarm?.stopSoundPreview?.();
    playingSound.current = null;
    setPlaying(null);
  }, [player]);

  const preview = useCallback(
    async (sound: ReminderSound) => {
      stop();
      setError(null);
      if (sound === 'silent' || !canPreviewSound(sound)) return;
      const request = generation.current;
      try {
        if (sound === 'default') {
          const result = Alarm?.previewDefaultSound?.() ?? 'unavailable';
          if (result !== 'playing') {
            setError(previewErrors[result]);
            return;
          }
        } else {
          await setAudioModeAsync({
            allowsRecording: false,
            playsInSilentMode: false,
            shouldPlayInBackground: false,
            interruptionMode: 'mixWithOthers',
          });
          // A newer choice, screen exit or background event cancels pending playback.
          if (request !== generation.current) return;
          player.replace(previewSources[sound]);
          player.play();
        }
        playingSound.current = sound;
        setPlaying(sound);
        timer.current = setTimeout(stop, 4000);
      } catch {
        if (request !== generation.current) return;
        stop();
        setError(previewErrors.unavailable);
      }
    },
    [player, stop],
  );

  useEffect(() => {
    if (playingSound.current !== 'default' && status.didJustFinish) stop();
  }, [status.didJustFinish, stop]);

  useEffect(() => {
    if (playing !== 'default') return;
    const interval = setInterval(() => {
      if (!Alarm?.isSoundPreviewPlaying?.()) stop();
    }, 100);
    return () => clearInterval(interval);
  }, [playing, stop]);

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

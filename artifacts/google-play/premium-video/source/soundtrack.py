"""Original, deterministic ambient score. No samples or third-party composition.

80 BPM, D major / B minor, soft mallet harmonics with a quiet stereo pad.
Written as 48 kHz / 24-bit stereo PCM for the 30-second NurVaxt film.
"""
from pathlib import Path
import wave
import numpy as np

SR = 48000
DURATION = 30
rng = np.random.default_rng(22010)
mix = np.zeros((SR * DURATION, 2), np.float64)


def add(start, samples, pan=0):
    pos = int(start * SR)
    length = min(len(samples), len(mix) - pos)
    if length <= 0:
        return
    gain = np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)])
    mix[pos:pos + length] += samples[:length, None] * gain


def note(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def mallet(midi, start, amp=.10, pan=0):
    t = np.arange(int(3.2 * SR)) / SR
    f = note(midi)
    attack = 1 - np.exp(-t / .009)
    tone = (np.sin(2 * np.pi * f * t) * np.exp(-t / 1.05)
            + .24 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .52)
            + .055 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / .23))
    add(start, amp * tone * attack, pan)
    for delay, gain in [(.29, .17), (.53, .10), (.87, .065)]:
        add(start + delay, amp * tone * attack * gain, -pan)


chords = [[50, 57, 61, 66], [47, 54, 59, 62], [43, 50, 57, 59], [45, 52, 57, 61], [50, 57, 61, 66]]
for index, chord in enumerate(chords):
    t = np.arange(int(7.2 * SR)) / SR
    env = np.minimum(t / 1.4, 1) * np.minimum((7.2 - t) / 1.5, 1)
    for k, midi in enumerate(chord):
        f = note(midi)
        phase = rng.uniform(0, 2 * np.pi)
        pad = np.sin(2 * np.pi * f * t + .002 * np.sin(t * 2))
        pad += .32 * np.sin(2 * np.pi * f * 1.0018 * t + phase)
        pad += .12 * np.sin(2 * np.pi * f * 2 * t + phase)
        add(index * 6, pad * env * .021, (k - 1.5) * .35)

patterns = [[74, 69, 66, 73, 69, 78], [71, 66, 74, 69, 66, 73], [74, 69, 67, 71, 69, 78], [73, 69, 64, 71, 69, 76], [74, 69, 66, 73, 78, 74]]
for i, notes in enumerate(patterns):
    for j, pitch in enumerate(notes):
        mallet(pitch, i * 6 + [0.15, .9, 2.4, 3.15, 4.65, 5.4][j], .075 if j % 3 else .11, (-1) ** j * .32)

# Subtle, low-level breath between chapters, smoothly filtered by summation.
for start in [5.65, 11.65, 17.65, 23.65]:
    n = int(.7 * SR)
    noise = rng.normal(0, 1, n)
    noise = np.convolve(noise, np.ones(160) / 160, mode='same')
    envelope = np.sin(np.linspace(0, np.pi, n)) ** 3
    add(start, noise * envelope * .035, .15)

time = np.arange(len(mix)) / SR
fade = np.minimum(time / .18, 1) * np.minimum((DURATION - time) / 1.3, 1)
mix *= fade[:, None]
mix /= max(1, np.max(np.abs(mix)) / .68)
data = np.round(np.clip(mix, -.999, .999) * (2 ** 23 - 1)).astype(np.int32)
packed = np.stack([data & 255, (data >> 8) & 255, (data >> 16) & 255], axis=-1).astype(np.uint8)
with wave.open(str(Path(__file__).with_name('soundtrack.wav')), 'wb') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(3)
    wav.setframerate(SR)
    wav.writeframes(packed.tobytes())
print('Original 30-second stereo score ready')

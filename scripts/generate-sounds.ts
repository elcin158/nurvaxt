import { writeFile } from 'node:fs/promises';

/** Original synthesized notification sounds, mono 16-bit PCM; all under two seconds. */
export async function generateReminderSounds() {
  const rate = 22050;
  const note = (t: number, frequency: number, decay: number) =>
    t < 0 ? 0 : Math.sin(t * 2 * Math.PI * frequency) * Math.exp(-decay * t) * Math.min(1, t * 60);
  const sounds = [
    {
      name: 'tone',
      duration: 1,
      sample: (t: number) =>
        (Math.sin(t * 2 * Math.PI * 660) + 0.3 * Math.sin(t * 2 * Math.PI * 990)) *
        Math.exp(-5 * t) *
        Math.min(1, t * 40) *
        0.2,
    },
    {
      name: 'soft',
      duration: 1.4,
      sample: (t: number) => (note(t, 440, 3.5) + 0.25 * note(t, 660, 4)) * 0.22,
    },
    {
      name: 'bell',
      duration: 1.8,
      sample: (t: number) =>
        (note(t, 880, 5) +
          0.3 * note(t, 1760, 7) +
          note(t - 0.45, 1046.5, 5) +
          0.3 * note(t - 0.45, 2093, 7)) *
        0.2,
    },
    {
      name: 'melody',
      duration: 1.8,
      sample: (t: number) =>
        (note(t, 523.25, 6) + note(t - 0.3, 659.25, 6) + note(t - 0.6, 783.99, 4)) * 0.24,
    },
  ];
  for (const { name, duration, sample } of sounds) {
    const length = Math.round(rate * duration);
    const pcm = Buffer.alloc(length * 2);
    for (let i = 0; i < length; i++) {
      // Fade the tail to zero without changing the existing one-second tone.
      const fade = name === 'tone' ? 1 : Math.min(1, (length - 1 - i) / (rate * 0.03));
      pcm.writeInt16LE(Math.round(sample(i / rate) * fade * 32767), i * 2);
    }
    const header = Buffer.alloc(44);
    header.write('RIFF');
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(rate, 24);
    header.writeUInt32LE(rate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    await writeFile(`assets/nurvaxt_${name}.wav`, Buffer.concat([header, pcm]));
  }
}

if (process.argv[1]?.endsWith('generate-sounds.ts')) {
  generateReminderSounds().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

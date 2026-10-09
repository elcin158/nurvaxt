import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
async function main() {
  const original = await readFile('assets/brand.svg', 'utf8');
  await sharp(Buffer.from(original)).png().toFile('assets/icon.png');
  const foreground = original.replace(/<rect[^>]+\/>/, '');
  const adaptive = foreground.replace('viewBox="0 0 1024 1024"', 'viewBox="-220 -220 1464 1464"');
  await sharp(Buffer.from(adaptive)).png().toFile('assets/adaptive-icon.png');
  const mono = adaptive.replaceAll('#C8A96B', '#FFFFFF').replaceAll('#F7F8F5', '#FFFFFF');
  await sharp(Buffer.from(mono)).png().toFile('assets/monochrome.png');
  await sharp(Buffer.from(mono)).resize(96, 96).png().toFile('assets/notification-icon.png');
  await sharp(Buffer.from(foreground)).resize(288, 288).png().toFile('assets/splash.png');
  // Original synthesized tone; no third-party audio or azan recording.
  const rate = 22050;
  const length = rate;
  const pcm = Buffer.alloc(length * 2);
  for (let i = 0; i < length; i++) {
    const t = i / rate;
    const envelope = Math.exp(-5 * t) * Math.min(1, t * 40);
    const sample =
      (Math.sin(t * 2 * Math.PI * 660) + 0.3 * Math.sin(t * 2 * Math.PI * 990)) * envelope * 0.2;
    pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
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
  await writeFile('assets/nurvaxt_tone.wav', Buffer.concat([header, pcm]));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

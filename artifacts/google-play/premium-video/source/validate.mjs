import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.dirname(here);
const req = createRequire(path.join(process.env.NURVAXT_VIDEO_TOOLS || '/tmp/nurvaxt-premium-tools', 'package.json'));
const ffmpeg = req('ffmpeg-static'), ffprobe = req('ffprobe-static').path;
const qa = path.join(here, 'qa'); fs.mkdirSync(qa, { recursive: true });
const report = { date: '2026-10-22', files: [], visualReview: 'See storyboard images extracted from the encoded deliverables.' };
for (const [size, orientation] of [['1920x1080', 'landscape'], ['1080x1920', 'portrait']]) {
  const file = path.join(out, `nurvaxt-premium-${size}-30s.mp4`);
  const probe = JSON.parse(spawnSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }).stdout);
  const video = probe.streams.find(s => s.codec_type === 'video'), audio = probe.streams.find(s => s.codec_type === 'audio');
  if (`${video.width}x${video.height}` !== size || video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p' || video.avg_frame_rate !== '30/1' || Number(video.nb_frames) !== 900 || Number(probe.format.duration) !== 30 || audio.codec_name !== 'aac' || audio.channels !== 2) throw new Error('Unexpected output specification');
  const decode = spawnSync(ffmpeg, ['-hide_banner', '-v', 'error', '-i', file, '-f', 'null', '-'], { encoding: 'utf8' });
  if (decode.status !== 0 || decode.stderr.trim()) throw new Error('Decode failure: ' + decode.stderr);
  const level = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-af', 'loudnorm=I=-20:TP=-2:LRA=8:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const loudness = JSON.parse(level.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/s)[0]);
  if (Number(loudness.input_tp) > -1 || Number(loudness.input_i) < -25 || Number(loudness.input_i) > -16) throw new Error('Unexpected audio level');
  const times = [0, 2, 6.27, 8, 12.27, 14, 18.27, 21.8, 24.27, 26, 28.5, 29.95];
  const thumbs = [];
  const tw = orientation === 'landscape' ? 640 : 270, th = orientation === 'landscape' ? 360 : 480;
  for (const [i, t] of times.entries()) {
    const frame = path.join(qa, `${orientation}-${String(i).padStart(2, '0')}.png`);
    const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(t), '-i', file, '-frames:v', '1', frame], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
    const label = Buffer.from(`<svg width="${tw}" height="${th+28}"><rect y="${th}" width="${tw}" height="28" fill="#07172e"/><text x="12" y="${th+19}" fill="#d2e9ff" font-family="sans-serif" font-size="14">${t.toFixed(2)} s</text></svg>`);
    const tile = await sharp({ create: { width: tw, height: th + 28, channels: 3, background: '#07172e' } }).composite([{ input: await sharp(frame).resize(tw, th).toBuffer(), left: 0, top: 0 }, { input: label, left: 0, top: 0 }]).png().toBuffer();
    thumbs.push({ input: tile, left: (i % 4) * tw, top: Math.floor(i / 4) * (th + 28) });
    if (t === 2) await sharp(frame).jpeg({ quality: 96 }).toFile(path.join(out, orientation === 'landscape' ? 'youtube-thumbnail-1920x1080.jpg' : 'portrait-cover-1080x1920.jpg'));
  }
  await sharp({ create: { width: tw * 4, height: (th + 28) * 3, channels: 3, background: '#07172e' } }).composite(thumbs).jpeg({ quality: 94 }).toFile(path.join(out, `${orientation}-storyboard.jpg`));
  const bytes = fs.readFileSync(file);
  const moovBeforeMdat = bytes.indexOf(Buffer.from('moov')) < bytes.indexOf(Buffer.from('mdat'));
  if (!moovBeforeMdat) throw new Error('faststart metadata missing');
  report.files.push({ file: path.basename(file), width: video.width, height: video.height, durationSeconds: 30, frames: 900, fps: 30, videoCodec: video.codec_name, pixelFormat: video.pix_fmt, colorSpace: video.color_space, audioCodec: audio.codec_name, audioChannels: audio.channels, audioSampleRate: Number(audio.sample_rate), loudnessLUFS: Number(loudness.input_i), truePeakDbTP: Number(loudness.input_tp), faststart: moovBeforeMdat, fullDecodePassed: true, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  console.log('Validated', path.basename(file));
}
fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify(report, null, 2) + '\n');

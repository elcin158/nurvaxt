import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
const here = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(path.join(process.env.NURVAXT_VIDEO_TOOLS || '/tmp/nurvaxt-premium-tools', 'package.json'));
const ffmpeg = req('ffmpeg-static');
const names = ['01-namaz-vaxtlari', '02-canli-bildiris', '03-qible', '04-xatirlatmalar', '05-tund-gorunus'];
for (const name of names) {
  if (!fs.existsSync(path.join(here, 'captures', `${name}.png`))) continue;
  const bounds = name.startsWith('02')
    ? JSON.parse(fs.readFileSync(path.join(here, 'captures', `${name}.crop.json`)))
    : { left: 0, top: 108, width: 1080, height: 1980 };
  await sharp(path.join(here, 'captures', `${name}.png`)).extract(bounds).png().toFile(path.join(here, 'assets', `${name}.png`));
  const frames = path.join(here, 'frames', name);
  fs.mkdirSync(frames, { recursive: true });
  const scale = name.startsWith('02') ? 1008 : 720;
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(here, 'captures', `${name}.mp4`), '-vf', `crop=${bounds.width}:${bounds.height}:${bounds.left}:${bounds.top},tpad=stop_mode=clone:stop_duration=8,fps=15,scale=${scale}:-1:flags=lanczos`, '-t', '8', '-q:v', '2', path.join(frames, '%04d.jpg')], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  console.log('Prepared', name);
}

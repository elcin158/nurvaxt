import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = path.join(root, 'source/android-walkthrough.mp4');
const output = path.join(root, 'nurvaxt-preview-30s.mp4');
try { await fs.access(raw); } catch { await fs.rename(output, raw); }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
<defs>
<linearGradient id="bg" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#071E5B"/><stop offset=".56" stop-color="#084ABD"/><stop offset="1" stop-color="#087BD6"/></linearGradient>
<radialGradient id="glow"><stop stop-color="#1FCAFF" stop-opacity=".5"/><stop offset="1" stop-color="#1FCAFF" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1920" height="1080" fill="url(#bg)"/>
<ellipse cx="1700" cy="180" rx="800" ry="850" fill="url(#glow)"/>
<g fill="none" stroke="#A8EFFF" stroke-opacity=".13"><circle cx="1880" cy="80" r="660"/><circle cx="1880" cy="80" r="770"/></g>
<g font-family="Noto Sans, sans-serif">
<text x="96" y="190" fill="#FFFFFF" font-size="65" font-weight="700" letter-spacing="-1.5">NurVaxt</text>
<rect x="96" y="230" width="86" height="7" rx="3.5" fill="#3DD9FF"/>
<text x="90" y="458" fill="#FFFFFF" font-size="120" font-weight="700" letter-spacing="-3">Hər gün,</text>
<text x="90" y="604" fill="#FFFFFF" font-size="120" font-weight="700" letter-spacing="-3">vaxtında.</text>
<text x="96" y="711" fill="#D6EEFF" font-size="36">Namaz vaxtları · Təqvim · Qiblə</text>
<line x1="96" y1="864" x2="978" y2="864" stroke="#92D9FF" stroke-opacity=".27"/>
<text x="96" y="931" fill="#D6EEFF" font-size="31">Azərbaycanın 74 şəhər və rayonu</text>
</g>
<rect x="1228" y="40" width="570" height="1000" rx="24" fill="#E9F7FF"/>
</svg>`;
await fs.writeFile(path.join(root, 'source/video-background.svg'), svg);
const background = path.join(root, 'source/video-background.png');
await sharp(Buffer.from(svg)).removeAlpha().png().toFile(background);
const ffmpeg = process.env.NURVAXT_FFMPEG ?? '/tmp/nurvaxt-video-tools/package/ffmpeg';
const result = spawnSync(ffmpeg, [
  '-hide_banner', '-y', '-loop', '1', '-framerate', '30', '-i', background,
  '-i', raw, '-filter_complex',
  '[1:v]scale=554:984,setsar=1[app];[0:v][app]overlay=1236:48:shortest=0:eof_action=repeat,format=yuv420p[out]',
  '-map', '[out]', '-an', '-t', '30', '-r', '30', '-c:v', 'libx264',
  '-preset', 'fast', '-crf', '20', '-threads', '2', '-movflags', '+faststart', output,
], { encoding: 'utf8' });
await fs.writeFile(path.join(root, 'source/video-export.log'), result.stderr ?? '');
if (result.status !== 0) throw new Error(result.stderr);
console.log('Exported 30-second 1920×1080 H.264 video');

/** NurVaxt / Premium film. Deterministic 30-second motion design, real Android footage. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const out = path.dirname(here);
const require = createRequire(path.join(process.env.NURVAXT_VIDEO_TOOLS || '/tmp/nurvaxt-premium-tools', 'package.json'));
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const ffmpeg = require('ffmpeg-static');
const portrait = process.argv.includes('--portrait');
const preview = process.argv.includes('--preview');
const W = portrait ? 1080 : 1920, H = portrait ? 1920 : 1080;
const fps = 30, duration = 30;
for (const [weight, name] of [[400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold'], [800, 'ExtraBold']]) {
  GlobalFonts.registerFromPath(path.join(root, `node_modules/@expo-google-fonts/manrope/${weight}${name}/Manrope_${weight}${name}.ttf`), 'Manrope');
}
const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
const layer = createCanvas(W, H), lc = layer.getContext('2d');
const names = ['01-namaz-vaxtlari', '02-canli-bildiris', '03-qible', '04-xatirlatmalar', '05-tund-gorunus'];
const stills = await Promise.all(names.map(n => loadImage(path.join(here, `assets/${n}.png`))));
const icon = await loadImage(path.join(root, 'artifacts/google-play/app-icon-512.png'));
const frameFiles = names.map(n => {
  const folder = path.join(here, 'frames', n);
  return fs.existsSync(folder) ? fs.readdirSync(folder).filter(f => f.endsWith('.jpg')).sort().map(f => path.join(folder, f)) : [];
});
const cache = new Map();
async function footage(index, time) {
  if (preview || !frameFiles[index].length) return stills[index];
  const files = frameFiles[index];
  const filename = files[Math.min(files.length - 1, Math.max(0, Math.floor(time * 15)))];
  if (!cache.has(filename)) {
    cache.set(filename, await loadImage(filename));
    if (cache.size > 24) cache.delete(cache.keys().next().value);
  }
  return cache.get(filename);
}
const clamp = v => Math.min(1, Math.max(0, v));
const ease = v => 1 - (1 - clamp(v)) ** 4;
const smooth = v => { const x = clamp(v); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;
const scenes = [
  { light: false, label: 'NAMAZ VAXTLARI', lines: ['Hər gün,', 'vaxtında.'], sub: 'Namaz vaxtları. Aydın və sadə.', tag: 'Azərbaycanın 74 bölgəsi', size: 116 },
  { light: true, label: 'CANLI BİLDİRİŞ', lines: ['Qalan vaxt,', 'bir baxışda.'], sub: 'Canlı geri sayım bildiriş panelində.', tag: 'Tətbiqi açmadan izləyin', size: 103 },
  { light: false, label: 'QİBLƏ KOMPASI', lines: ['Qibləni', 'asanlıqla tapın.'], sub: 'Şəhərinizə görə qiblə istiqaməti.', tag: 'İstiqamət bir baxışda', size: 94 },
  { light: true, label: 'XATIRLATMALAR', lines: ['Xatırlatmalar,', 'sizə uyğun.'], sub: 'Namazdan əvvəl vaxtı özünüz seçin.', tag: 'Gündəlik ritminizə uyğun', size: 94 },
  { light: false, label: 'TÜND GÖRÜNÜŞ', lines: ['Gecəyə uyğun', 'sakit görünüş.'], sub: 'Açıq və tünd görünüş seçimi.', tag: 'Hər saatda eyni aydınlıq', size: 94 },
];

function round(c, x, y, w, h, r, fill, stroke, sw = 1) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = sw; c.stroke(); }
}
function text(c, value, x, y, size, color, weight = 500, spacing = 0, align = 'left') {
  c.font = `${weight} ${size}px Manrope`; c.fillStyle = color;
  c.textBaseline = 'alphabetic'; c.textAlign = align; c.letterSpacing = `${spacing}px`;
  c.fillText(value, x, y); c.letterSpacing = '0px'; c.textAlign = 'left';
}
function glow(c, x, y, radius, color) {
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color); g.addColorStop(1, color.replace(/,[^,]+\)$/, ',0)'));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function background(c, s, t) {
  const g = c.createLinearGradient(0, 0, W, H);
  if (s.light) { g.addColorStop(0, '#f7faff'); g.addColorStop(0.65, '#edf4fc'); g.addColorStop(1, '#dbe9f9'); }
  else { g.addColorStop(0, '#061127'); g.addColorStop(0.55, '#081c43'); g.addColorStop(1, '#083774'); }
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  glow(c, W * .82 + Math.sin(t * .2) * 50, H * .47, W * .58, s.light ? 'rgba(96,173,255,0.15)' : 'rgba(15,105,233,0.31)');
  glow(c, W * .62, H * .97, W * .4, s.light ? 'rgba(100,215,243,0.12)' : 'rgba(20,176,213,0.15)');
  const cx = W * (portrait ? .54 : .78), cy = H * (portrait ? .64 : .5);
  c.save(); c.translate(cx, cy); c.rotate(-.35 + t * .008);
  c.strokeStyle = s.light ? 'rgba(49,102,174,0.10)' : 'rgba(132,192,255,0.11)';
  for (let i = 0; i < 3; i++) {
    c.lineWidth = i === 0 ? 1.5 : 1;
    c.beginPath(); c.ellipse(0, 0, (portrait ? 420 : 560) + i * 92, (portrait ? 650 : 575) + i * 50, 0, 0, Math.PI * 2); c.stroke();
  }
  // One slowly travelling highlight, accessory to the genuine UI.
  const rad = portrait ? 650 : 575;
  c.strokeStyle = s.light ? 'rgba(20,117,225,0.23)' : 'rgba(114,222,255,0.40)'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(0, 0, portrait ? 420 : 560, rad, 0, t * .09, t * .09 + .45); c.stroke();
  c.restore();
}
function phone(c, screen, x, y, width, rotation = 0, alpha = 1) {
  const inset = width * .018, height = (width - inset * 2) * 1980 / 1080 + inset * 2;
  c.save(); c.globalAlpha *= alpha; c.translate(x + width / 2, y + height / 2); c.rotate(rotation);
  const px = -width / 2, py = -height / 2, r = width * .085;
  c.shadowColor = 'rgba(1,9,31,0.35)'; c.shadowBlur = width * .13; c.shadowOffsetY = width * .065;
  round(c, px, py, width, height, r, '#132740');
  c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
  const edge = c.createLinearGradient(px, py, px + width, py + height);
  edge.addColorStop(0, '#d9e8f7'); edge.addColorStop(.24, '#829ab7'); edge.addColorStop(.5, '#213856'); edge.addColorStop(.76, '#53799d'); edge.addColorStop(1, '#b8d3e9');
  round(c, px, py, width, height, r, edge);
  round(c, px + 2, py + 2, width - 4, height - 4, r - 1, '#132338');
  c.save(); c.beginPath(); c.roundRect(px + inset, py + inset, width - inset * 2, height - inset * 2, r - inset); c.clip();
  c.drawImage(screen, px + inset, py + inset, width - inset * 2, height - inset * 2); c.restore();
  round(c, px + 1, py + 1, width - 2, height - 2, r, null, 'rgba(237,248,255,0.30)', 1);
  c.restore();
  return height;
}
function notification(c, frame, x, y, width, alpha) {
  const height = width * frame.height / frame.width;
  c.save(); c.globalAlpha *= alpha;
  c.shadowColor = 'rgba(13,44,82,0.22)'; c.shadowBlur = 50; c.shadowOffsetY = 22;
  round(c, x, y, width, height, width * .063, '#e8e7f0');
  c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.beginPath(); c.roundRect(x, y, width, height, width * .063); c.clip();
  c.drawImage(frame, x, y, width, height); c.restore();
}
function pill(c, s, value, x, y, a) {
  c.save(); c.globalAlpha *= a; c.font = '600 22px Manrope';
  const width = c.measureText(value).width + 67;
  round(c, x, y, width, 51, 25, s.light ? 'rgba(8,92,199,0.055)' : 'rgba(108,187,255,0.075)', s.light ? 'rgba(10,83,174,0.15)' : 'rgba(154,207,255,0.18)');
  c.beginPath(); c.arc(x + 24, y + 25, 4, 0, Math.PI * 2); c.fillStyle = s.light ? '#0665d5' : '#82e4ee'; c.fill();
  text(c, value, x + 40, y + 33, 22, s.light ? '#245480' : '#d3e8fa', 600); c.restore();
}
function brand(c, s, t) {
  const x = portrait ? 72 : 128, y = portrait ? 76 : 69;
  c.save(); c.globalAlpha = ease((t + .2) / .7);
  round(c, x, y, 48, 48, 13, '#056afa');
  c.save(); c.beginPath(); c.roundRect(x, y, 48, 48, 13); c.clip(); c.drawImage(icon, x, y, 48, 48); c.restore();
  text(c, 'NurVaxt', x + 64, y + 35, 32, s.light ? '#132b49' : '#f7fbff', 800, -1);
  c.restore();
}
function copy(c, s, u, index, closing) {
  const ink = s.light ? '#112c4c' : '#f6faff';
  const accent = s.light ? '#0766d9' : '#8fe7f1';
  const muted = s.light ? '#516a85' : '#acc4df';
  const x = portrait ? 72 : 128;
  const labelY = portrait ? 205 : 296;
  const baseY = portrait ? 322 : 425;
  const sz = portrait ? 82 : s.size;
  const lineH = portrait ? 97 : s.size * 1.11;
  // Stagger outgoing and incoming copy so two headlines never overlap.
  const gate = u >= 6 ? 1 - smooth((u - 6) / .22) : index > 0 ? smooth((u - .24) / .28) : 1;
  const exit = 1 - clamp(closing * 2.2), enter = smooth((closing - .5) * 2);
  const reveal = index === 0 ? u + .8 : u;
  c.save(); c.globalAlpha = gate * exit * ease((reveal + .15) / .8);
  text(c, s.label, x, labelY + (1 - ease(u / .7)) * 12, portrait ? 19 : 18, accent, 700, 3.4);
  c.restore();
  for (let i = 0; i < 2; i++) {
    const p = ease((reveal + .12 - i * .09) / .85);
    c.save(); c.globalAlpha = gate * p * exit;
    c.beginPath(); c.rect(x - 8, baseY + i * lineH - sz - 15, portrait ? 970 : 1000, sz + 38); c.clip();
    text(c, s.lines[i], x - 4, baseY + i * lineH + (1 - p) * 62, sz, i ? accent : ink, 800, -3.5); c.restore();
  }
  const subY = portrait ? 476 : baseY + lineH + 76;
  c.save(); c.globalAlpha = gate * ease((reveal - .16) / .8) * exit;
  text(c, s.sub, x, subY, portrait ? 27 : 28, muted, 500, -.3);
  if (!portrait) pill(c, s, s.tag, x, subY + 66, ease((u - .4) / .8));
  c.restore();
  if (closing > 0) {
    c.save(); c.globalAlpha = enter;
    text(c, 'NurVaxt', x - 4, portrait ? 332 : 463, portrait ? 116 : 142, ink, 800, -6);
    text(c, 'Hər gün, vaxtında.', x, portrait ? 423 : 562, portrait ? 47 : 54, accent, 600, -1.5);
    text(c, 'Namaz vaxtları · Qiblə · Xatırlatmalar', x, portrait ? 490 : 645, portrait ? 26 : 28, muted, 500, -.4);
    c.restore();
  }
  if (!portrait) {
    text(c, 'AZƏRBAYCAN ÜÇÜN', x, H - 105, 16, muted, 600, 3.3);
    const lengths = 68, gap = 11, y = H - 72;
    for (let i = 0; i < 5; i++) {
      round(c, x + i * (lengths + gap), y, lengths, 3, 2, s.light ? 'rgba(45,87,137,.15)' : 'rgba(183,214,247,.18)');
      if (i <= index) round(c, x + i * (lengths + gap), y, lengths * (i < index ? 1 : clamp(u / 6)), 3, 2, accent);
    }
    text(c, `0${index + 1} / 05`, x + 425, H - 65, 16, muted, 600, 1.5);
  } else {
    text(c, closing > .5 ? 'AZƏRBAYCAN ÜÇÜN' : s.tag, W / 2, H - 77, 22, muted, 600, closing > .5 ? 3 : .3, 'center');
    for (let i = 0; i < 5; i++) round(c, W / 2 - 95 + i * 40, H - 44, i === index ? 30 : 8, 4, 2, i === index ? accent : s.light ? '#bccfe3' : '#385579');
  }
}
async function scene(c, index, u, time) {
  const s = scenes[index]; background(c, s, time); brand(c, s, time);
  const closing = index === 4 ? smooth((u - 4.1) / .65) : 0;
  copy(c, s, u, index, closing);
  const p = ease((u + .35) / 1.25), bob = Math.sin(u * .65) * 5;
  const screen = await footage(index, Math.max(0, u));
  if (index === 1) {
    const home = await footage(0, 5);
    if (portrait) {
      phone(c, home, 315, 958 + bob + 28 * (1 - p), 450, -.025, p);
      const q = ease((u - .15) / .9);
      notification(c, screen, 72, 624 + 55 * (1 - q), 936, q);
      text(c, 'ANDROID BİLDİRİŞ PANELİ', 80, 593, 17, '#55708d', 700, 2.7);
    } else {
      phone(c, home, 1308 + 55 * (1 - p), 159 + bob, 424, .038, p);
      const q = ease((u - .15) / .9);
      notification(c, screen, 878 + 80 * (1 - q), 427 + bob * .6, 916, q);
      c.save(); c.globalAlpha = q;
      text(c, 'ANDROID BİLDİRİŞ PANELİ', 900, 395 + bob * .6, 16, '#4b6685', 700, 2.3); c.restore();
    }
  } else if (portrait) {
    const width = 640;
    phone(c, screen, (W - width) / 2 + (1 - p) * 35, 557 + bob + (1 - p) * 40, width, (1 - p) * .05 + Math.sin(u * .35) * .004, p);
  } else {
    const width = 480;
    const px = 1236 + (1 - p) * 85 + Math.sin(u * .31) * 4;
    phone(c, screen, px, 82 + bob + (1 - p) * 25, width, -.025 + p * .017 + Math.sin(u * .35) * .004, p);
  }
}

async function render(t) {
  const index = Math.min(4, Math.floor(t / 6));
  const u = t - index * 6;
  if (index > 0 && u < .56) {
    await scene(ctx, index - 1, 6 + u, t);
    lc.clearRect(0, 0, W, H); await scene(lc, index, u, t);
    ctx.save(); ctx.globalAlpha = smooth(u / .56); ctx.drawImage(layer, 0, 0); ctx.restore();
  } else await scene(ctx, index, u, t);
}

if (preview) {
  for (const t of [1.5, 7.6, 13.6, 19.6, 25.6, 29.2]) {
    await render(t);
    fs.writeFileSync(path.join(out, `preview-${portrait ? 'portrait' : 'landscape'}-${t}.png`), canvas.toBuffer('image/png'));
  }
  console.log('Preview frames ready');
} else {
  const filename = path.join(out, `nurvaxt-premium-${portrait ? '1080x1920' : '1920x1080'}-30s.mp4`);
  const proc = spawn(ffmpeg, ['-hide_banner', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${W}x${H}`, '-framerate', String(fps), '-i', 'pipe:0', '-i', path.join(here, 'soundtrack.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-threads', '4', '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-af', 'volume=6.06dB', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', '30', '-movflags', '+faststart', '-metadata', 'title=NurVaxt — Hər gün, vaxtında.', '-metadata', 'comment=Real NurVaxt 1.0.12 (15) Android footage; original procedural soundscape.', filename], { stdio: ['pipe', 'ignore', 'pipe'] });
  let log = ''; proc.stderr.on('data', chunk => { log += chunk; });
  const completion = once(proc, 'close');
  proc.stdin.on('error', e => { if (e.code !== 'EPIPE') throw e; });
  for (let f = 0; f < duration * fps; f++) {
    await render(f / fps);
    if (!proc.stdin.write(Buffer.from(canvas.data()))) await once(proc.stdin, 'drain');
    if (f % 90 === 0) console.log(`${portrait ? 'Portrait' : 'Landscape'}: ${Math.round(f / (duration * fps) * 100)}%`, new Date().toISOString());
  }
  proc.stdin.end(); const [code] = await completion;
  fs.writeFileSync(path.join(here, `render-${portrait ? 'portrait' : 'landscape'}.log`), log);
  if (code !== 0) throw new Error(log);
  console.log('Exported', filename);
}

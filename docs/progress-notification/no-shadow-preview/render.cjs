const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '../../..');
const colors = fs.readFileSync(path.join(root, 'modules/nurvaxt-alarm/android/src/main/res/values/colors.xml'), 'utf8');
const color = name => colors.match(new RegExp(`<color name="${name}">(#[0-9A-Fa-f]+)</color>`))[1];
const mark = fs.readFileSync(path.join(root, 'modules/nurvaxt-alarm/android/src/main/res/drawable-nodpi/nurvaxt_countdown_app_mark.png')).toString('base64');
// Design preview from the current RemoteViews sizes and Canvas artwork. No device capture.
// Only the outer track/marker shadows are omitted; the existing gloss is retained.
const left = 52, width = 292, scale = width / 360;
const x = fraction => left + 2 * scale + 356 * scale * fraction;
const y = 126, radius = 6 * scale, marker = 8 * scale;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="675" viewBox="0 0 360 225">
  <defs>
    <linearGradient id="blue" x1="${x(0)}" x2="${x(.7)}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="${color('countdown_progress_start')}"/><stop offset="1" stop-color="${color('countdown_progress_end')}"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="${y-radius}" x2="0" y2="${y+radius}" gradientUnits="userSpaceOnUse">
      <stop stop-color="white" stop-opacity=".4392"/><stop offset=".45" stop-color="white" stop-opacity="0"/>
      <stop offset=".55" stop-color="#101c40" stop-opacity="0"/><stop offset="1" stop-color="#101c40" stop-opacity=".1882"/>
    </linearGradient>
    <linearGradient id="markerGloss" x1="0" y1="${y-marker+1.25*scale}" x2="0" y2="${y}" gradientUnits="userSpaceOnUse">
      <stop stop-color="white" stop-opacity=".1569"/><stop offset="1" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="track"><rect x="${x(0)}" y="${y-radius}" width="${356*scale}" height="${radius*2}" rx="${radius}"/></clipPath>
  </defs>
  <rect width="360" height="225" fill="#d9d9e1"/>
  <rect width="360" height="225" rx="28" fill="#e9e7ef"/>
  <circle cx="28" cy="28" r="12" fill="#4169bd"/>
  <image x="20" y="20" width="16" height="16" href="data:image/png;base64,${mark}"/>
  <g font-family="Noto Sans, sans-serif">
    <text x="52" y="33" font-size="12" fill="#484952">NurVaxt</text>
    <circle cx="332" cy="28" r="12" fill="#d7d5df"/>
    <path d="M326.5 30 L332 24.5 L337.5 30" stroke="#24262d" stroke-width="1.7" fill="none"/>
    <text x="52" y="89" font-size="22" font-weight="700" fill="${color('countdown_primary')}">Əsr<tspan font-size="16.72" font-weight="400" fill="${color('countdown_secondary')}"> · 16:10</tspan></text>
    <text x="344" y="92" text-anchor="end" font-size="34" font-weight="700" fill="${color('countdown_primary')}" style="font-variant-numeric:tabular-nums">06:57</text>
    <g clip-path="url(#track)">
      <rect x="${x(0)}" y="${y-radius}" width="${356*scale}" height="${radius*2}" fill="${color('countdown_progress_track')}"/>
      <rect x="${x(0)}" y="${y-radius}" width="${x(.7)-x(0)}" height="${radius*2}" fill="url(#blue)"/>
      <rect x="${x(.48)}" y="${y-radius}" width="${x(.887)-x(.48)}" height="${radius*2}" fill="${color('countdown_kerahat_track')}"/>
      <rect x="${x(0)}" y="${y-radius}" width="${356*scale}" height="${radius*2}" fill="url(#gloss)"/>
    </g>
    <rect x="${x(0)+.325*scale}" y="${y-radius+.325*scale}" width="${355.35*scale}" height="${11.35*scale}" rx="${radius}" stroke="white" stroke-opacity=".749" stroke-width="${.65*scale}" fill="none"/>
    <circle cx="${x(.7)}" cy="${y}" r="${marker}" fill="${color('countdown_progress_indicator_outline')}"/>
    <circle cx="${x(.7)}" cy="${y}" r="${marker-1.25*scale}" fill="${color('countdown_progress_indicator')}"/>
    <circle cx="${x(.7)}" cy="${y}" r="${marker-1.25*scale}" fill="url(#markerGloss)"/>
    <path d="M52 156.5 H344" stroke="#1b1b1f" stroke-opacity=".12"/>
    <text x="52" y="194" font-size="16.5" font-weight="500" fill="${color('countdown_kerahat')}">Kərahət bitməsinə<tspan font-size="12.54" font-weight="400"> · 16:07</tspan></text>
    <text x="344" y="196" text-anchor="end" font-size="28" font-weight="500" fill="${color('countdown_kerahat')}">4</text>
  </g>
</svg>`;
(async () => {
  fs.writeFileSync(path.join(__dirname, 'expanded-light.svg'), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, 'expanded-light.png'));
  console.log('Created shadow-free design preview: expanded-light.png (1080 × 675)');
})();

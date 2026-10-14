import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { generateReminderSounds } from './generate-sounds';
/** The artwork as an app badge: square, full-bleed, with rounded corners cut out of the alpha. */
async function roundedBadge(size: number) {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.24)}" fill="#fff"/></svg>`,
  );
  return sharp('assets/adaptive-source.png')
    .resize(size, size)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}
async function main() {
  // Keep the supplied artwork as the source of truth; do not redraw its lettering.
  const original = await readFile('assets/icon-source.png');
  await sharp(original).resize(1024, 1024).png().toFile('assets/icon.png');
  // The full-bleed adaptation removes the source's white outer frame. Its extra
  // inset keeps the wordmark and crescent inside Android's 66/108 safe circle.
  const inset = await sharp('assets/adaptive-source.png').resize(800, 800).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#0649D6' } })
    .composite([{ input: inset, gravity: 'centre' }])
    .png()
    .toFile('assets/adaptive-icon.png');
  // In-app badge: the full-bleed artwork, with no white frame to show at the edges. The
  // component rounds its own corners, so the asset keeps every pixel of the square.
  await sharp('assets/adaptive-source.png').resize(512, 512).png().toFile('assets/app-icon.png');
  // The splash has no component to round it, so the asset carries its own corners and is
  // transparent outside them. Drawn from the frameless artwork: the store icon's white border
  // used to sit on the splash background, which is near-white in light and navy in dark.
  // 144 dp at Android's highest (4x) density, without upscaling the badge.
  await writeFile('assets/splash.png', await roundedBadge(576));
  // Single-colour glyph for tinted chrome such as the tab bar. The artwork is a light
  // wordmark and crescent over a blue gradient, so everything brighter than the gradient's
  // ceiling is exactly the mark; that becomes the alpha channel of a flat white square.
  const ramp = 255 / (245 - 195);
  const silhouette = await sharp('assets/adaptive-source.png')
    .resize(256, 256)
    .greyscale()
    .linear(ramp, -195 * ramp)
    .toColourspace('b-w')
    .raw()
    .toBuffer();
  await sharp({ create: { width: 256, height: 256, channels: 3, background: '#FFFFFF' } })
    .joinChannel(silhouette, { raw: { width: 256, height: 256, channels: 1 } })
    .png()
    .toFile('assets/mark-mono.png');
  // Android can choose the adaptive monochrome icon for automatic notification groups.
  // Keep the full NurVaxt lettering and crescent there too, inside the 66/108 safe circle.
  const launcherSilhouette = await sharp('assets/adaptive-source.png')
    .resize(600, 600)
    .greyscale()
    .linear(ramp, -195 * ramp)
    .toColourspace('b-w')
    .raw()
    .toBuffer();
  await sharp({ create: { width: 600, height: 600, channels: 3, background: '#FFFFFF' } })
    .joinChannel(launcherSilhouette, { raw: { width: 600, height: 600, channels: 1 } })
    .extend({ top: 212, bottom: 212, left: 212, right: 212, background: '#00000000' })
    .png()
    .toFile('assets/monochrome.png');
  // Keep the full original mark, including the crescent above its lettering.
  // Android tints it from alpha. The last hour stacks the mark above the time.
  const notificationMark = await sharp('assets/mark-mono.png')
    .trim()
    .resize(80, 80, { fit: 'contain', background: '#00000000' })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#00000000' })
    .png()
    .toBuffer();
  await writeFile('assets/notification-icon.png', notificationMark);
  await writeFile(
    'modules/nurvaxt-alarm/android/src/main/res/drawable-nodpi/nurvaxt_countdown_app_mark.png',
    notificationMark,
  );
  await generateReminderSounds();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

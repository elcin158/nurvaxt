import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import config from '../app.config';
import { releaseFeedSchema } from '../src/features/app-updates/release-feed';
import { findRelease, releaseNotesText, releases } from '../src/features/app-updates/releases';

const root = resolve(__dirname, '..');
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  version: string;
};
const versionCode = config.android?.versionCode ?? 0;
const release = findRelease(versionCode);
if (!release || release.version !== version || config.version !== version)
  throw new Error('App version, build code and bundled release notes must match.');
const gradle = readFileSync(resolve(root, 'android/app/build.gradle'), 'utf8');
if (
  Number(gradle.match(/versionCode\s+(\d+)/)?.[1]) !== versionCode ||
  gradle.match(/versionName\s+"([^"]+)"/)?.[1] !== version
)
  throw new Error('Android native version does not match the release notes.');

const text = releaseNotesText(release);
const characters = Array.from(text).length;
if (characters > 500)
  throw new Error(`Google Play release notes exceed 500 characters: ${characters}`);
const output = resolve(root, `artifacts/google-play/release-notes-${version}-az.txt`);
const feedOutput = resolve(root, 'updates.json');
const feedText =
  JSON.stringify(
    releaseFeedSchema.parse({
      schemaVersion: 1,
      packageName: config.android?.package,
      releases,
    }),
    null,
    2,
  ) + '\n';
if (process.argv.includes('--check')) {
  if (!existsSync(output) || readFileSync(output, 'utf8') !== text)
    throw new Error('Play Store and in-app release notes differ. Run npm run release:notes.');
  if (!existsSync(feedOutput) || readFileSync(feedOutput, 'utf8') !== feedText)
    throw new Error('GitHub release feed and in-app notes differ. Run npm run release:notes.');
  console.log(`Release notes match: ${version} (${versionCode}), ${characters}/500 characters.`);
} else {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, text);
  writeFileSync(feedOutput, feedText);
  console.log(`Generated ${output} (${characters}/500 characters).`);
  console.log(`Generated ${feedOutput} (${releases.length} releases).`);
}

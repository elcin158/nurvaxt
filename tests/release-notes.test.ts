import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../app.config';
import { releaseFeedSchema } from '../src/features/app-updates/release-feed';
import { findRelease, releaseNotesText, releases } from '../src/features/app-updates/releases';

test('the Play Store text exactly matches the current in-app release and fits the store limit', () => {
  const release = findRelease(config.android!.versionCode!)!;
  const { version } = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));
  expect(release.version).toBe(version);
  expect(release.version).toBe(config.version);
  const storeText = readFileSync(
    resolve(__dirname, `../artifacts/google-play/release-notes-${version}-az.txt`),
    'utf8',
  );
  expect(storeText).toBe(releaseNotesText(release));
  expect(Array.from(storeText).length).toBeLessThanOrEqual(500);
});

test('the published GitHub feed matches the bundled history and includes the current build', () => {
  const feed = releaseFeedSchema.parse(
    JSON.parse(readFileSync(resolve(__dirname, '../updates.json'), 'utf8')),
  );
  expect(feed.releases).toEqual(releases);
  expect(findRelease(config.android!.versionCode!, feed.releases)?.version).toBe(config.version);
});

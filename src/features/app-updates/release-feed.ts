import type AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { findRelease, type ReleaseNotes } from './releases';

export const RELEASE_FEED_URL =
  'https://raw.githubusercontent.com/elcin158/nurvaxt/main/updates.json';
const CACHE_KEY = 'nurvaxt-release-feed-v1';
const CACHE_TTL = 15 * 60 * 1000;
const RETRY_INTERVAL = 60 * 1000;
const TIMEOUT = 5000;
const MAX_LENGTH = 256 * 1024;

const releaseSchema = z.object({
  versionCode: z.number().int().positive(),
  version: z.string().trim().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  important: z.boolean(),
  items: z
    .array(
      z.object({
        icon: z.enum([
          'notifications-outline',
          'time-outline',
          'checkmark-circle-outline',
          'sparkles-outline',
        ]),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(1000),
      }),
    )
    .min(1)
    .max(30),
});

export const releaseFeedSchema = z.object({
  schemaVersion: z.literal(1),
  packageName: z.literal('az.nurvaxt.app'),
  releases: z
    .array(releaseSchema)
    .max(250)
    .refine(
      (entries) => new Set(entries.map((entry) => entry.versionCode)).size === entries.length,
    ),
});
const cacheSchema = z.object({
  fetchedAt: z.number().finite(),
  feed: releaseFeedSchema,
});
type CachedFeed = z.infer<typeof cacheSchema>;
type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
type FetchFeed = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'text'>>;

// This feed supplies text only. Google Play remains the authority for update eligibility.
export function createReleaseFeed(storage: Storage, fetchFeed: FetchFeed = fetch, now = Date.now) {
  let cached: CachedFeed | undefined;
  let loaded: Promise<void> | undefined;
  let pending: Promise<void> | null = null;
  const lastAttempts = new Map<number, number>();
  const fresh = (timestamp: number, ttl: number) => {
    const elapsed = now() - timestamp;
    return elapsed >= 0 && elapsed < ttl;
  };

  function loadCache() {
    return (loaded ??= (async () => {
      try {
        const raw = await storage.getItem(CACHE_KEY);
        if (!raw || raw.length > MAX_LENGTH) return;
        const parsed = cacheSchema.safeParse(JSON.parse(raw));
        if (parsed.success) cached = parsed.data;
      } catch {}
    })());
  }

  async function refresh() {
    if (pending) return pending;
    pending = (async () => {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const feed = await Promise.race([
          (async () => {
            const response = await fetchFeed(RELEASE_FEED_URL, {
              signal: controller.signal,
              headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
            });
            if (!response.ok) throw new Error('Release feed is unavailable.');
            const text = await response.text();
            if (text.length > MAX_LENGTH) throw new Error('Release feed is too large.');
            return releaseFeedSchema.parse(JSON.parse(text));
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error('Release feed request timed out.'));
            }, TIMEOUT);
          }),
        ]);
        clearTimeout(timer);
        cached = { fetchedAt: now(), feed };
        await storage.setItem(CACHE_KEY, JSON.stringify(cached)).catch(() => {});
      } catch {
        // Missing, invalid and offline responses retain the last validated feed.
      } finally {
        clearTimeout(timer);
        pending = null;
      }
    })();
    return pending;
  }

  return {
    async get(versionCode: number, force = false): Promise<ReleaseNotes | undefined> {
      if (!Number.isSafeInteger(versionCode) || versionCode <= 0) return;
      await loadCache();
      const release = findRelease(versionCode, cached?.feed.releases ?? []);
      const retryAllowed = !fresh(lastAttempts.get(versionCode) ?? -Infinity, RETRY_INTERVAL);
      if (
        pending ||
        force ||
        ((!release || !cached || !fresh(cached.fetchedAt, CACHE_TTL)) && retryAllowed)
      ) {
        lastAttempts.set(versionCode, now());
        await refresh();
      }
      return findRelease(versionCode, cached?.feed.releases ?? []);
    },
  };
}

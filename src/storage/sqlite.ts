import * as SQLite from 'expo-sqlite';

// Opening a database first creates its directory. On Android two opens running at once race on
// that mkdirs and the loser fails ("Path already points to a non-normal file") on a fresh install,
// so every file database of the app is opened through this queue, one at a time.
let queue: Promise<unknown> = Promise.resolve();
export function openDatabaseAsync(file: string, options?: SQLite.SQLiteOpenOptions) {
  const opened = queue.then(() => SQLite.openDatabaseAsync(file, options));
  queue = opened.catch(() => undefined);
  return opened;
}

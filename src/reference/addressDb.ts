import * as SQLite from 'expo-sqlite';
import { openDatabaseAsync } from '../storage/sqlite';
import { ApiConnectionError } from '../auth/api';
import { adminTree, byLabel, type AddressBook, type AddressCounts, type AdminUnit, type Entrance, type Street } from './types';

// The address register, shared by both modules and every user of the device. It is public
// reference data, so it is stored as plain rows: the forms query it by index and never read it
// whole. A download fills `*_next` tables and swaps them in by rename only when complete, so an
// interrupted download keeps the previous register and resumes where it stopped.
const FILE = 'evtas-reference.db';
const SCHEMA_VERSION = 4;
const TABLES = {
  'admin-units': { name: 'admin_units', columns: 'id INTEGER PRIMARY KEY, label TEXT NOT NULL, parent_id INTEGER, country_id INTEGER, has_street INTEGER NOT NULL',
    insert: `id, label, parent_id, country_id, has_street) SELECT json_extract(value, '$.id'), json_extract(value, '$.label'),
      json_extract(value, '$.parentId'), json_extract(value, '$.countryId'), json_extract(value, '$.hasStreet')`,
    index: 'CREATE INDEX IF NOT EXISTS admin_units_country ON admin_units (country_id)' },
  streets: { name: 'streets', columns: 'id INTEGER PRIMARY KEY, label TEXT NOT NULL, admin_unit_id INTEGER NOT NULL, parent_id INTEGER, has_entrance INTEGER NOT NULL',
    insert: `id, label, admin_unit_id, parent_id, has_entrance) SELECT json_extract(value, '$.id'), json_extract(value, '$.label'),
      json_extract(value, '$.adminUnitId'), json_extract(value, '$.parentId'), json_extract(value, '$.hasEntrance')`,
    index: 'CREATE INDEX IF NOT EXISTS streets_admin_unit ON streets (admin_unit_id)' },
  entrances: { name: 'entrances', columns: 'id INTEGER PRIMARY KEY, label TEXT NOT NULL, admin_unit_id INTEGER NOT NULL, through_fare_id INTEGER NOT NULL',
    insert: `id, label, admin_unit_id, through_fare_id) SELECT json_extract(value, '$.id'), json_extract(value, '$.label'),
      json_extract(value, '$.adminUnitId'), json_extract(value, '$.throughFareId')`,
    index: 'CREATE INDEX IF NOT EXISTS entrances_street ON entrances (through_fare_id)' },
} as const;
export type AddressTable = keyof typeof TABLES;
const ADDRESS_TABLES = Object.keys(TABLES) as AddressTable[];
const tables = (suffix: string) => Object.values(TABLES).map(t => `CREATE TABLE IF NOT EXISTS ${t.name}${suffix} (${t.columns});`).join('\n');

let opening: Promise<SQLite.SQLiteDatabase> | null = null;
/** The read connection the forms query synchronously. */
function database() {
  opening ??= openDatabaseAsync(FILE).then(async db => {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    const version = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
    // A register of an older layout is dropped and downloaded again. Incremental auto-vacuum is set
    // while the file is empty, so a swap can return the old register's pages to the file system.
    if (version !== SCHEMA_VERSION) await db.execAsync(`${Object.values(TABLES).map(t => `DROP TABLE IF EXISTS ${t.name}; DROP TABLE IF EXISTS ${t.name}_next;`).join(' ')}
      DROP TABLE IF EXISTS meta; PRAGMA auto_vacuum = INCREMENTAL; VACUUM; PRAGMA user_version = ${SCHEMA_VERSION};`);
    await db.execAsync(`${tables('')}${tables('_next')}${Object.values(TABLES).map(t => `${t.index};`).join('\n')}
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    return db;
  }).catch(cause => { opening = null; throw cause; });
  return opening;
}

/** `bytes` is the register's size on the device. */
export type StoredAddresses = { book: AddressBook; counts: AddressCounts; downloadedAt: string; bytes: number };
type UnitRow = { id: number; label: string; parent_id: number | null; country_id: number; has_street: number };
type StreetRow = { id: number; label: string; parent_id: number | null; admin_unit_id: number; has_entrance: number };
type EntranceRow = { id: number; label: string; admin_unit_id: number; through_fare_id: number };

/**
 * Opens the stored register for one user; `accountAdminUnitIds` are where they may keep accounts.
 * Null when no complete register is on the device. Admin units (a few thousand) are held in
 * memory; streets and entrances are read by index when a form asks for them.
 */
export async function openAddresses(accountAdminUnitIds: number[]): Promise<StoredAddresses | null> {
  const db = await database();
  const meta = Object.fromEntries((await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM meta')).map(x => [x.key, x.value]));
  if (!meta.complete || !meta.counts) return null;
  const pages = await db.getFirstAsync<{ page_count: number }>('PRAGMA page_count'), size = await db.getFirstAsync<{ page_size: number }>('PRAGMA page_size');
  const account = new Set(accountAdminUnitIds);
  const units = (await db.getAllAsync<UnitRow>('SELECT * FROM admin_units')).map((row): AdminUnit =>
    ({ id: row.id, label: row.label, parentId: row.parent_id, countryId: row.country_id, hasStreet: !!row.has_street, canSelectAccount: account.has(row.id) }));
  const street = (row: StreetRow): Street => ({ id: row.id, label: row.label, parentId: row.parent_id, adminUnitId: row.admin_unit_id, hasEntrance: !!row.has_entrance });
  const entrance = (row: EntranceRow): Entrance => ({ id: row.id, label: row.label, adminUnitId: row.admin_unit_id, throughFareId: row.through_fare_id });
  const id = (value: unknown) => Number(value) || 0;
  const book: AddressBook = {
    ready: true,
    ...adminTree(units),
    street: value => { const row = db.getFirstSync<StreetRow>('SELECT * FROM streets WHERE id = ?', id(value)); return row ? street(row) : null; },
    streets: adminUnitId => byLabel(db.getAllSync<StreetRow>('SELECT * FROM streets WHERE admin_unit_id = ?', adminUnitId).map(street)),
    entrance: value => { const row = db.getFirstSync<EntranceRow>('SELECT * FROM entrances WHERE id = ?', id(value)); return row ? entrance(row) : null; },
    entrances: (adminUnitId, throughFareId) => byLabel(db.getAllSync<EntranceRow>(
      'SELECT * FROM entrances WHERE through_fare_id = ? AND admin_unit_id = ?', throughFareId, adminUnitId).map(entrance)),
  };
  return { book, counts: JSON.parse(meta.counts) as AddressCounts, downloadedAt: meta.complete, bytes: (pages?.page_count ?? 0) * (size?.page_size ?? 0) };
}

/** Where an interrupted download stands: the table and id to continue from, and rows written of `total`. */
type Resume = { table: AddressTable; after: number; done: number; total?: number; startedAt: string };
const RESUME_FOR = 3 * 24 * 60 * 60 * 1000;
const fresh = (resume: Resume | null): resume is Resume => !!resume && Date.now() - new Date(resume.startedAt).getTime() <= RESUME_FOR;

/** An interrupted download that the next one will continue, as rows written of the total; null when there is none. */
export async function partialAddresses(): Promise<{ done: number; total: number } | null> {
  const db = await database();
  const saved = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = 'resume'`);
  const resume = saved ? JSON.parse(saved.value) as Resume : null;
  return fresh(resume) && resume.total ? { done: resume.done, total: resume.total } : null;
}
/**
 * Downloads the whole register. `fetchPage` returns a page's raw JSON (`{ items, next }`); SQLite
 * parses and inserts it on its own thread, so the JavaScript thread never holds a page's rows.
 * Writes go through a second connection, so the forms keep reading the current register meanwhile.
 * Returns false when `alive` turned false (sign-out) before the end.
 */
export async function downloadAddresses(counts: AddressCounts, fetchPage: (table: AddressTable, after: number) => Promise<string>,
  onProgress: (done: number, total: number) => void, alive: () => boolean) {
  await database();
  const db = await openDatabaseAsync(FILE, { useNewConnection: true });
  try {
    await db.execAsync('PRAGMA journal_size_limit = 4194304;');
    const total = counts.adminUnits + counts.streets + counts.entrances;
    const saved = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = 'resume'`);
    let resume = saved ? JSON.parse(saved.value) as Resume : null;
    if (!fresh(resume)) {
      await db.execAsync(Object.values(TABLES).map(t => `DELETE FROM ${t.name}_next;`).join(' '));
      resume = { table: ADDRESS_TABLES[0], after: 0, done: 0, startedAt: new Date().toISOString() };
    }
    resume = { ...resume, total };
    for (const table of ADDRESS_TABLES.slice(ADDRESS_TABLES.indexOf(resume.table))) {
      let after: number | null = table === resume.table ? resume.after : 0;
      while (after != null) {
        onProgress(resume.done, total);
        const json = await fetchPage(table, after);
        if (!alive()) return false;
        // A connection dropped mid-response can hand over a truncated body; it is a lost page, not data.
        if (!(await db.getFirstAsync<{ ok: number }>('SELECT json_valid(?) AS ok', json))?.ok) throw new ApiConnectionError(false);
        const { changes } = await db.runAsync(`INSERT OR REPLACE INTO ${TABLES[table].name}_next (${TABLES[table].insert} FROM json_each(?, '$.items')`, json);
        after = (await db.getFirstAsync<{ next: number | null }>(`SELECT json_extract(?, '$.next') AS next`, json))?.next ?? null;
        const next = ADDRESS_TABLES[ADDRESS_TABLES.indexOf(table) + 1];
        resume = after != null ? { ...resume, table, after, done: resume.done + changes }
          : { ...resume, table: next ?? table, after: 0, done: resume.done + changes };
        await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES ('resume', ?)`, JSON.stringify(resume));
      }
    }
    await db.withExclusiveTransactionAsync(async tx => {
      for (const t of Object.values(TABLES))
        await tx.execAsync(`DROP TABLE ${t.name}; ALTER TABLE ${t.name}_next RENAME TO ${t.name}; CREATE TABLE ${t.name}_next (${t.columns}); ${t.index};`);
      await tx.runAsync(`DELETE FROM meta WHERE key = 'resume'`);
      await tx.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES ('counts', ?), ('complete', ?)`, JSON.stringify(counts), new Date().toISOString());
    });
    // The replaced register's pages go back to the file system, and the WAL is emptied.
    await db.execAsync('PRAGMA incremental_vacuum; PRAGMA wal_checkpoint(TRUNCATE);');
    onProgress(total, total);
    return true;
  } finally { await db.closeAsync(); }
}
